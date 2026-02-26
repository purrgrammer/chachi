import { useQuery, useQueries } from "@tanstack/react-query";
import { useLiveQuery } from "dexie-react-hooks";
import { NDKEvent } from "@nostr-dev-kit/ndk";
import { useAtomValue } from "jotai";
import { useEffect, useMemo } from "react";
import {
  getLastGroupMessage,
  getGroupReactions,
  getLastSeen,
  getUnreadMessages,
} from "@/lib/dms/queries";
import db, { DMGroupSummary } from "@/lib/db";
import { NostrEvent } from "nostr-tools";
import NDK, {
  NDKRelaySet,
  NDKFilter,
  NDKUser,
  NDKKind,
  NDKSubscriptionCacheUsage,
} from "@nostr-dev-kit/ndk";
import { giftUnwrap } from "@/lib/nip-59";
import { useRelaySet } from "@/lib/nostr";
import { useNDK } from "@/lib/ndk";
import { discoveryRelays } from "@/lib/relay";
import { usePubkey, useFollows } from "@/lib/account";
import { useRelays } from "@/lib/nostr";
import { PrivateGroup as Group, PrivateGroup } from "@/lib/types";
import { useOnWebRTCSignal } from "@/components/webrtc";
import { WEBRTC_SIGNAL } from "@/lib/kinds";
import { privateMessagesEnabledAtom } from "@/app/store";
import { triggerLastSeenSync } from "@/lib/lastSeenSyncTrigger";
import Dexie from "dexie";

export interface UserRelayList {
  pubkey: string;
  dm: string[];           // NIP-17 kind 10050 relays
  outbox: string[];       // NIP-65 kind 10002 relays
  fallback: string[];     // Discovery/user relay fallback
  source: 'nip17' | 'nip65' | 'discovery' | 'user-relays';
  timestamp: number;
  error?: string;
}

export function groupId(event: NostrEvent) {
  const p = event.tags
    .filter((tag) => tag[0] === "p" && tag[1])
    .map((t) => t[1]);
  return Array.from(new Set([event.pubkey, ...p]))
    .sort()
    .join("");
}

export function useEvent(id: string) {
  return useLiveQuery(() => db.dms.get({ id }), [id]);
}

export function idToGroup(id: string, pubkey: string) {
  const pubkeys = splitIntoChunks(id, 64);
  return {
    id,
    pubkeys: pubkeys.includes(pubkey) ? pubkeys : [...pubkeys, pubkey],
  };
}

export async function savePrivateEvent(event: NostrEvent, gift: NostrEvent) {
  const gid = groupId(event);
  const record = {
    id: event.id,
    kind: event.kind,
    created_at: event.created_at,
    content: event.content,
    tags: event.tags,
    pubkey: event.pubkey,
    group: gid,
    gift: gift.id,
  };
  await db.dms.put(record);
  await updateDMGroupSummary(gid, event);
}

async function updateDMGroupSummary(gid: string, event: NostrEvent) {
  const isReaction = event.kind === NDKKind.Reaction;
  const existing = await db.dmGroups.get(gid);

  if (existing) {
    const updates: Partial<DMGroupSummary> = {};
    // Track new sender
    if (!existing.senderPubkeys.includes(event.pubkey)) {
      updates.senderPubkeys = [...existing.senderPubkeys, event.pubkey];
    }
    // Update last message if this is newer and not a reaction
    if (!isReaction && event.created_at > existing.lastMessageAt) {
      updates.lastMessageAt = event.created_at;
      updates.lastMessageContent = event.content;
      updates.lastMessagePubkey = event.pubkey;
      updates.lastMessageTags = event.tags;
    }
    if (Object.keys(updates).length > 0) {
      await db.dmGroups.update(gid, updates);
    }
  } else {
    const pubkeys = splitIntoChunks(gid, 64);
    await db.dmGroups.put({
      id: gid,
      pubkeys,
      lastMessageAt: isReaction ? 0 : event.created_at,
      lastMessageContent: isReaction ? "" : event.content,
      lastMessagePubkey: isReaction ? "" : event.pubkey,
      lastMessageTags: isReaction ? [] : event.tags,
      senderPubkeys: [event.pubkey],
    });
  }
}

function useStreamMap(
  filter: NDKFilter | NDKFilter[],
  relaySet: NDKRelaySet,
  transform: (ev: NDKEvent) => Promise<NostrEvent | null>,
  pubkey?: string,
  enabled = true,
) {
  const ndk = useNDK();

  useEffect(() => {
    if (!pubkey) return;
    if (!enabled) return;

    const sub = ndk.subscribe(
      filter,
      {
        subId: "gift-wrap",
        cacheUsage: NDKSubscriptionCacheUsage.ONLY_RELAY,
        closeOnEose: false,
        skipOptimisticPublishEvent: true,
        groupable: false,
      },
      relaySet,
    );

    console.log('[Gift Wrap] Subscription started');

    sub.on("event", (event) => {
      transform(event).catch(err => {
        console.error('[Gift Wrap] Failed to process event:', event.id, err);
      });
    });

    sub.on("eose", () => {
      console.log('[Gift Wrap] Initial sync complete (EOSE received)');
    });

    return () => {
      console.log('[Gift Wrap] Subscription stopped');
      sub.stop();
    };
  }, [pubkey, enabled]);
}

export async function fetchDirectMessageRelays(
  ndk: NDK,
  pubkey: string,
  userMainRelays?: string[]
): Promise<UserRelayList> {

  // Step 1: Get user's outbox relays (kind 10002)
  const { fetchRelayList } = await import("@/lib/nostr");
  const outboxRelays = await fetchRelayList(ndk, pubkey);

  // Step 2: Combine discovery relays + user's outbox relays for searching
  const searchRelays = [...new Set([...discoveryRelays, ...outboxRelays])];
  const searchRelaySet = NDKRelaySet.fromRelayUrls(searchRelays, ndk);

  console.log(`[Relay Discovery] Searching for kind 10050 on ${searchRelays.length} relays (${discoveryRelays.length} discovery + ${outboxRelays.length} outbox)`);

  // Step 3: Try to find NIP-17 kind 10050 on combined relay set
  try {
    const dmRelayList = await ndk.fetchEvent({
      kinds: [NDKKind.DirectMessageReceiveRelayList],
      authors: [pubkey],
    }, {
      closeOnEose: true,
      cacheUsage: NDKSubscriptionCacheUsage.CACHE_FIRST
    }, searchRelaySet);

    if (dmRelayList) {
      const dm = Array.from(
        new Set(
          dmRelayList.tags
            .filter((tag) => tag[0] === "relay")
            .map((tag) => tag[1])
        )
      );

      if (dm.length > 0) {
        console.log(`[NIP-17] Found ${dm.length} DM relays for ${pubkey.slice(0, 8)}`);
        return {
          pubkey,
          dm,
          outbox: outboxRelays,
          fallback: [],
          source: 'nip17',
          timestamp: Date.now()
        };
      }
    }
  } catch (err) {
    console.warn(`[Relay Discovery] Failed to fetch kind 10050: ${err}`);
  }

  // Step 4: Fall back to outbox relays if kind 10050 not found
  if (outboxRelays.length > 0) {
    console.log(`[NIP-65] Using ${outboxRelays.length} outbox relays for ${pubkey.slice(0, 8)}`);
    return {
      pubkey,
      dm: [],
      outbox: outboxRelays,
      fallback: [],
      source: 'nip65',
      timestamp: Date.now()
    };
  }

  // Step 5: Fall back to discovery relays
  if (discoveryRelays.length > 0) {
    console.log(`[Fallback] Using discovery relays for ${pubkey.slice(0, 8)}`);
    return {
      pubkey,
      dm: [],
      outbox: [],
      fallback: discoveryRelays,
      source: 'discovery',
      timestamp: Date.now()
    };
  }

  // Step 6: Fall back to user's main relays
  if (userMainRelays && userMainRelays.length > 0) {
    console.log(`[Fallback] Using user main relays for ${pubkey.slice(0, 8)}`);
    return {
      pubkey,
      dm: [],
      outbox: [],
      fallback: userMainRelays,
      source: 'user-relays',
      timestamp: Date.now()
    };
  }

  // Step 7: Return empty with error (never throw)
  console.error(`[Error] No relays found for ${pubkey.slice(0, 8)} after exhaustive search`);
  return {
    pubkey,
    dm: [],
    outbox: [],
    fallback: [],
    source: 'discovery',
    error: 'No relays found after exhaustive search',
    timestamp: Date.now()
  };
}

export function useGroupRelays(group: Group) {
  const ndk = useNDK();
  const userMainRelays = useRelays();
  const q = useQueries({
    queries: group.pubkeys.map((pubkey) => ({
      queryKey: ["direct-message-relays", pubkey],
      queryFn: () => fetchDirectMessageRelays(ndk, pubkey, userMainRelays),
      retry: 2,
      staleTime: 1000 * 60 * 5, // 5 minutes
    })),
  });
  return q.map(q => q.data).filter(Boolean);
}

export function useGroupRelaySetMap(group: Group): Map<string, NDKRelaySet> {
  const ndk = useNDK();
  const relayList = useGroupRelays(group);

  const relaySetMap = useMemo(() => {
    const map = new Map<string, NDKRelaySet>();

    for (const pubkey of group.pubkeys) {
      const list = relayList.find(r => r?.pubkey === pubkey);
      if (!list) continue;

      // Priority: dm → outbox → fallback
      const relays = list.dm.length > 0
        ? list.dm
        : list.outbox.length > 0
          ? list.outbox
          : list.fallback;

      if (relays.length === 0) continue;

      const relaySet = NDKRelaySet.fromRelayUrls(relays, ndk);
      map.set(pubkey, relaySet);
    }

    return map;
  }, [
    group.pubkeys.join(','), // Stable string for array comparison
    relayList,
    ndk
  ]);

  return relaySetMap;
}

export function useDirectMessageRelays(pubkey: string) {
  const ndk = useNDK();
  return useQuery({
    queryKey: ["direct-message-relays", pubkey],
    queryFn: () => fetchDirectMessageRelays(ndk, pubkey),
  });
}

export function useDirectMessages() {
  const ndk = useNDK();
  const pubkey = usePubkey();
  const onWebRTCSignal = useOnWebRTCSignal();
  const privateMessagesEnabled = useAtomValue(privateMessagesEnabledAtom);

  // Wait for signer to be ready
  const hasSigner = Boolean(ndk.signer);

  // Use the same relay discovery logic that senders use
  // This ensures we're listening on the relays where senders will publish
  const userMainRelays = useRelays();
  const { data: myRelayList } = useQuery({
    queryKey: ["my-dm-inbox-relays", pubkey],
    queryFn: () => pubkey ? fetchDirectMessageRelays(ndk, pubkey, userMainRelays) : null,
    enabled: Boolean(pubkey),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Listen on: dm relays → outbox relays → fallback relays
  const relays = myRelayList
    ? myRelayList.dm.length > 0
      ? myRelayList.dm
      : myRelayList.outbox.length > 0
        ? myRelayList.outbox
        : myRelayList.fallback
    : userMainRelays;

  const relaySet = useRelaySet(relays);

  // Log subscription details
  useEffect(() => {
    if (relaySet && relays.length > 0) {
      console.log('[DM Subscription] Listening on:', relays.length, 'relays', relays.map(r => new URL(r).hostname));
      console.log('[DM Subscription] Will fetch most recent 500 messages, then stream new ones');
    } else {
      console.warn('[DM Subscription] No relays available, waiting...');
    }
  }, [relaySet, relays]);

  // Only subscribe if we have signer and relays
  const shouldSubscribe = privateMessagesEnabled && hasSigner && relays.length > 0;

  // Use limit instead of time-based filter to avoid clock drift issues
  // Fetches most recent N messages on initial load, then streams new ones in real-time
  const filter = {
    kinds: [NDKKind.GiftWrap],
    "#p": [pubkey!],
    limit: 500,
  };
  useStreamMap(
    filter,
    relaySet!,
    async (event) => {
      // Check deduplication
      if (await db.dms.get({ gift: event.id })) {
        console.log('[Gift Wrap] Already processed:', event.id);
        return null;
      }

      try {
        const unwrapped = await giftUnwrap(
          event,
          new NDKUser({ pubkey: event.pubkey }),
          ndk.signer,
        );

        if (!unwrapped) {
          console.warn('[Gift Wrap] Decryption returned null for:', event.id);
          return null;
        }

        const raw = unwrapped.rawEvent() as unknown as NostrEvent;
        await savePrivateEvent(raw, event.rawEvent() as unknown as NostrEvent);
        console.log('[Gift Wrap] ✓ Processed message:', raw.id, 'from', raw.pubkey.slice(0, 8));

        // Handle WebRTC signals
        if (raw.kind === WEBRTC_SIGNAL) {
          try {
            onWebRTCSignal(raw);
          } catch (err) {
            console.error('[Gift Wrap] WebRTC signal error:', err);
          }
        }

        return raw;
      } catch (err: any) {
        console.error('[Gift Wrap] Processing failed for event:', event.id);
        console.error('[Gift Wrap] Error details:', err.message || err);
        console.error('[Gift Wrap] Has signer:', Boolean(ndk.signer));
        return null;
      }
    },
    pubkey,
    shouldSubscribe,
  );
  return null;
}

function splitIntoChunks(arr: string, chunkSize: number): string[] {
  const res: string[] = [];
  for (let i = 0; i < arr.length; i += chunkSize) {
    res.push(arr.slice(i, i + chunkSize));
  }
  return res;
}

export function useGroups() {
  const pubkey = usePubkey();
  const follows = useFollows();

  return useLiveQuery(
    async () => {
      if (!pubkey) return [];
      const followsSet = new Set(follows);
      const allGroups = await db.dmGroups.toArray();
      return allGroups
        .filter((g) => {
          // Accept if current user is a sender, or any followed user is a sender
          return g.senderPubkeys.some(
            (p) => p === pubkey || followsSet.has(p),
          );
        })
        .map((g) => ({
          id: g.id,
          pubkeys:
            g.id === pubkey
              ? [pubkey]
              : g.pubkeys.filter((p) => p !== pubkey),
        }))
        .filter((g) => g.pubkeys.length > 0) as Group[];
    },
    [pubkey, follows],
    [],
  );
}

export function useGroupRequests() {
  const pubkey = usePubkey();
  const follows = useFollows();

  return useLiveQuery(
    async () => {
      if (!pubkey) return [];
      const followsSet = new Set(follows);
      const allGroups = await db.dmGroups.toArray();
      return allGroups
        .filter((g) => {
          // Requests = groups where neither the user nor a follow has sent a message
          return !g.senderPubkeys.some(
            (p) => p === pubkey || followsSet.has(p),
          );
        })
        .map((g) => ({
          id: g.id,
          pubkeys: g.pubkeys.filter((p) => p !== pubkey),
        }))
        .filter((g) => g.pubkeys.length > 0);
    },
    [pubkey, follows],
    [],
  );
}

export function useGroupMessages(id: string) {
  return useLiveQuery(
    async () => {
      return await db.dms
        .where("[group+created_at]")
        .between([id, Dexie.minKey], [id, Dexie.maxKey])
        .reverse()
        .filter((e) => e.kind !== NDKKind.Reaction)
        .limit(100)
        .toArray();
    },
    [id],
    [],
  );
}

export function useSortedGroups() {
  const groups = useGroups();
  return useLiveQuery(
    async () => {
      if (groups.length === 0) return groups;
      const groupIds = new Set(groups.map((g) => g.id));
      const summaries = await db.dmGroups
        .orderBy("lastMessageAt")
        .reverse()
        .filter((s) => groupIds.has(s.id))
        .toArray();
      // Map back to Group shape preserving summary order
      const groupMap = new Map(groups.map((g) => [g.id, g]));
      return summaries
        .map((s) => groupMap.get(s.id))
        .filter(Boolean) as Group[];
    },
    [groups],
    groups,
  );
}

export interface GroupWithData extends PrivateGroup {
  lastMessage?: {
    content: string;
    tags: string[][];
    pubkey: string;
    created_at: number;
  };
  unreadCount: number;
}

interface SortedGroupsData {
  groups: GroupWithData[];
  requests: GroupWithData[];
}

const emptySortedGroupsData: SortedGroupsData = { groups: [], requests: [] };

export function useSortedGroupsWithData(): SortedGroupsData {
  const pubkey = usePubkey();
  const follows = useFollows();

  return useLiveQuery(
    async () => {
      if (!pubkey) return emptySortedGroupsData;
      const followsSet = new Set(follows);

      const allSummaries = await db.dmGroups
        .orderBy("lastMessageAt")
        .reverse()
        .toArray();

      const accepted: GroupWithData[] = [];
      const requests: GroupWithData[] = [];

      // Compute unreads in parallel for all groups
      const unreads = await Promise.all(
        allSummaries.map((s) =>
          getUnreadMessages({ id: s.id, pubkeys: s.pubkeys }, pubkey),
        ),
      );

      for (let i = 0; i < allSummaries.length; i++) {
        const s = allSummaries[i];
        const groupPubkeys =
          s.id === pubkey
            ? [pubkey]
            : s.pubkeys.filter((p) => p !== pubkey);
        if (groupPubkeys.length === 0) continue;

        const isAccepted = s.senderPubkeys.some(
          (p) => p === pubkey || followsSet.has(p),
        );

        const entry: GroupWithData = {
          id: s.id,
          pubkeys: groupPubkeys,
          lastMessage: s.lastMessageAt
            ? {
                content: s.lastMessageContent,
                tags: s.lastMessageTags,
                pubkey: s.lastMessagePubkey,
                created_at: s.lastMessageAt,
              }
            : undefined,
          unreadCount: unreads[i],
        };

        if (isAccepted) accepted.push(entry);
        else requests.push(entry);
      }

      return { groups: accepted, requests };
    },
    [pubkey, follows],
    emptySortedGroupsData,
  );
}

export function useSortedGroupRequests() {
  const groups = useGroupRequests();
  return useLiveQuery(
    async () => {
      if (groups.length === 0) return groups;
      const groupIds = new Set(groups.map((g) => g.id));
      const summaries = await db.dmGroups
        .orderBy("lastMessageAt")
        .reverse()
        .filter((s) => groupIds.has(s.id))
        .toArray();
      const groupMap = new Map(groups.map((g) => [g.id, g]));
      return summaries
        .map((s) => groupMap.get(s.id))
        .filter(Boolean) as Group[];
    },
    [groups],
    groups,
  );
}

export function useLastMessage(group: Group) {
  return useLiveQuery(
    async () => {
      const summary = await db.dmGroups.get(group.id);
      if (!summary || !summary.lastMessageAt) return undefined;
      return {
        content: summary.lastMessageContent,
        tags: summary.lastMessageTags,
        pubkey: summary.lastMessagePubkey,
        created_at: summary.lastMessageAt,
      };
    },
    [group.id],
  );
}

export function useGroupReactions(group: Group) {
  return useLiveQuery(() => getGroupReactions(group), [group.id]);
}

export function useLastSeen(group: Group) {
  return useLiveQuery(() => getLastSeen(group), [group.id]);
}

export function useUnreads() {
  const pubkey = usePubkey();
  const groups = useGroups();

  return useLiveQuery(
    async () => {
      if (!pubkey || !groups || groups.length === 0) return 0;

      // Get unread counts for each group in parallel
      const unreads = await Promise.all(
        groups.map((group) => getUnreadMessages(group, pubkey)),
      );
      return unreads.reduce((acc, curr) => acc + curr, 0);
    },
    [pubkey, groups],
    0,
  );
}

export function useUnreadMessages(group: Group) {
  const me = usePubkey();
  return useLiveQuery(() => getUnreadMessages(group, me), [group.id, me]);
}

export function usePrivateUnreadMessages() {
  const groups = useGroups();
  const me = usePubkey();
  return useLiveQuery(
    async () => {
      const unreads = await Promise.all(
        groups.map((group) => getUnreadMessages(group, me)),
      );
      return unreads.reduce((acc, curr) => acc + curr, 0);
    },
    [groups, me],
    0,
  );
}

export function saveLastSeen(ev: NostrEvent, group: PrivateGroup) {
  const ndkEvent = new NDKEvent(undefined, ev);
  const [tag, ref] = ndkEvent.tagReference();
  db.lastSeen.put({
    group: group.id,
    kind: ev.kind,
    created_at: ev.created_at,
    tag,
    ref,
  });

  // Trigger sync if enabled
  triggerLastSeenSync();
}

export function useSaveLastSeen(group: Group) {
  return (ev?: NostrEvent) => {
    if (ev) {
      saveLastSeen(ev, group);
    } else {
      getLastGroupMessage(group).then((ev) => {
        if (ev) {
          // @ts-expect-error db events are unsigned
          saveLastSeen(ev, group);
        }
      });
    }
  };
}

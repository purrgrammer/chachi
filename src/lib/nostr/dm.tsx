import { useQuery, useQueries } from "@tanstack/react-query";
import { useLiveQuery } from "dexie-react-hooks";
import { NDKEvent } from "@nostr-dev-kit/ndk";
import { useAtomValue } from "jotai";
import { useEffect } from "react";
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
import { usePubkey, useFollows, useDMRelays } from "@/lib/account";
import { PrivateGroup as Group, PrivateGroup } from "@/lib/types";
import { useOnWebRTCSignal } from "@/components/webrtc";
import { WEBRTC_SIGNAL } from "@/lib/kinds";
import { privateMessagesEnabledAtom } from "@/app/store";
import { triggerLastSeenSync } from "@/lib/lastSeenSyncTrigger";
import Dexie from "dexie";

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

    sub.on("event", (event) => {
      transform(event);
    });

    return () => sub.stop();
  }, [pubkey, enabled]);
}

export async function fetchDirectMessageRelays(ndk: NDK, pubkey: string) {
  // todo: look also in the users outbox relays
  const relaySet = NDKRelaySet.fromRelayUrls(discoveryRelays, ndk);
  const dmFilter = {
    kinds: [NDKKind.DirectMessageReceiveRelayList],
    authors: [pubkey],
  };
  const dmRelayList = await ndk.fetchEvent(
    dmFilter,
    { closeOnEose: true, cacheUsage: NDKSubscriptionCacheUsage.CACHE_FIRST },
    relaySet,
  );
  if (dmRelayList) {
    const dm = Array.from(
      new Set(
        dmRelayList.tags
          .filter((tag) => tag[0] === "relay")
          .map((tag) => tag[1]),
      ),
    );
    return { pubkey, dm, fallback: [] };
  } else {
    const readRelays = await ndk.fetchEvent(
      {
        kinds: [NDKKind.RelayList],
        authors: [pubkey],
      },
      { closeOnEose: true, cacheUsage: NDKSubscriptionCacheUsage.CACHE_FIRST },
      relaySet,
    );
    if (readRelays) {
      const relays = Array.from(
        new Set(
          readRelays.tags.filter((tag) => tag[0] === "r").map((tag) => tag[1]),
        ),
      );
      return { pubkey, dm: [], fallback: relays };
    }
    throw new Error("No relays found");
  }
}

export function useGroupRelays(group: Group) {
  const ndk = useNDK();
  const q = useQueries({
    queries: group.pubkeys.map((pubkey) => ({
      queryKey: ["direct-message-relays", pubkey],
      queryFn: () => fetchDirectMessageRelays(ndk, pubkey),
    })),
  });
  return Array.from(
    new Set(
      q
        .map((q) => q.data)
        .filter(Boolean)
        .flat(),
    ),
  );
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
  const dmRelays = useDMRelays();
  const onWebRTCSignal = useOnWebRTCSignal();
  const privateMessagesEnabled = useAtomValue(privateMessagesEnabledAtom);
  const relaySet = useRelaySet(dmRelays.dm || dmRelays.fallback);
  // todo: sync from latest - 2 weeks
  const filter = {
    kinds: [NDKKind.GiftWrap],
    "#p": [pubkey!],
  };
  useStreamMap(
    filter,
    relaySet!,
    async (event) => {
      if (await db.dms.get({ gift: event.id })) return null;

      try {
        const unwrapped = await giftUnwrap(
          event,
          new NDKUser({ pubkey: event.pubkey }),
          ndk.signer,
        );
        if (unwrapped) {
          const raw = unwrapped.rawEvent() as unknown as NostrEvent;
          savePrivateEvent(raw, event.rawEvent() as unknown as NostrEvent);
          if (raw.kind === WEBRTC_SIGNAL) {
            try {
              onWebRTCSignal(raw);
            } catch (err) {
              console.error(err);
            }
          }
          return raw;
        }
      } catch (err) {
        console.error(err);
      }
      return null;
    },
    pubkey,
    privateMessagesEnabled,
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

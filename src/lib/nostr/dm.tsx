import { useQuery, useQueries } from "@tanstack/react-query";
import { useLiveQuery } from "dexie-react-hooks";
import { NDKEvent } from "@nostr-dev-kit/ndk";
import { useAtomValue } from "jotai";
import { useEffect } from "react";
import {
  getLastGroupMessage,
  getGroupsSortedByLastMessage,
  getGroupReactions,
  getLastSeen,
  getUnreadMessages,
} from "@/lib/dms/queries";
import db from "@/lib/db";
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
import { useRelays } from "@/lib/nostr";
import { discoveryRelays } from "@/lib/relay";
import { usePubkey, useFollows, useDMRelays } from "@/lib/account";
import { PrivateGroup as Group, PrivateGroup } from "@/lib/types";
import { useOnWebRTCSignal } from "@/components/webrtc";
import { WEBRTC_SIGNAL } from "@/lib/kinds";
import { privateMessagesEnabledAtom } from "@/app/store";
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
  const record = {
    id: event.id,
    kind: event.kind,
    created_at: event.created_at,
    content: event.content,
    tags: event.tags,
    pubkey: event.pubkey,
    group: groupId(event),
    gift: gift.id,
  };
  return db.dms.put(record);
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
    console.log("REQ.GIFT", filter, relaySet.relays);

    const sub = ndk.subscribe(
      filter,
      {
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
  const relays = useRelays();
  const allRelays = Array.from(
    new Set(relays.concat(dmRelays.dm || dmRelays.fallback)),
  );
  const privateMessagesEnabled = useAtomValue(privateMessagesEnabledAtom);
  const relaySet = useRelaySet(allRelays);
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
      const groups = await db.dms.orderBy("group").uniqueKeys();
      const dms = await db.dms.toArray();
      return groups
        .filter((id) => {
          return (
            id === pubkey ||
            dms.some(
              (dm) =>
                dm.group === id &&
                (dm.pubkey === pubkey || follows.includes(dm.pubkey)),
            )
          );
        })
        .map((id) => {
          return {
            id,
            pubkeys:
              id === pubkey
                ? [pubkey]
                : splitIntoChunks(String(id), 64).filter((p) => p !== pubkey),
          };
        })
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
      const dms = await db.dms.toArray();
      return Array.from(new Set(dms.map((dm) => dm.group)))
        .filter((id) => {
          return !dms.some(
            (dm) =>
              dm.group === id &&
              (dm.pubkey === pubkey || follows.includes(dm.pubkey)),
          );
        })
        .map((id) => {
          return {
            id,
            pubkeys: splitIntoChunks(id, 64).filter((p) => p !== pubkey),
          };
        })
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
    () => getGroupsSortedByLastMessage(groups),
    [groups],
    groups,
  );
}

export function useSortedGroupRequests() {
  const groups = useGroupRequests();
  return useLiveQuery(
    () => getGroupsSortedByLastMessage(groups),
    [groups],
    groups,
  );
}

export function useLastMessage(group: Group) {
  return useLiveQuery(() => getLastGroupMessage(group), [group.id]);
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

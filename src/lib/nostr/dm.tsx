import { useQuery, useQueries } from "@tanstack/react-query";
import { useLiveQuery } from "dexie-react-hooks";
import { NDKEvent } from "@nostr-dev-kit/ndk";
import { useEffect, useState } from "react";
import {
  getLastGroupMessage,
  getGroupsSortedByLastMessage,
  getGroupReactions,
  getLastSeen,
  getUnreadMessages,
} from "@/lib/dms/queries";
import db, { LastSeen } from "@/lib/db";
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
import { usePubkey, useFollows } from "@/lib/account";
import { PrivateGroup as Group } from "@/lib/types";

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
) {
  const ndk = useNDK();
  const [events, setEvents] = useState<NostrEvent[]>([]);

  useEffect(() => {
    const sub = ndk.subscribe(
      filter,
      {
        cacheUsage: NDKSubscriptionCacheUsage.ONLY_RELAY,
        closeOnEose: false,
        skipOptimisticPublishEvent: true,
      },
      relaySet,
    );

    sub.on("event", (event) => {
      transform(event).then((ev) => {
        if (ev && !events.find((e) => e.id === ev.id)) {
          setEvents((evs) => [...evs, ev]);
        }
      });
    });

    return () => sub.stop();
  }, []);

  return events;
}

async function fetchDirectMessageRelays(ndk: NDK, pubkey: string) {
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
  const pubkey = usePubkey();
  //const dmRelays = useDMRelays();
  const relays = useRelays();
  const relaySet = useRelaySet(relays);
  const ndk = useNDK();
  const filter = {
    kinds: [NDKKind.GiftWrap],
    "#p": [pubkey!],
  };
  // todo: incremental sync
  useStreamMap(filter, relaySet!, async (event) => {
    if (await db.dms.get({ gift: event.id })) return null;

    const unwrapped = await giftUnwrap(
      event,
      new NDKUser({ pubkey: event.pubkey }),
      ndk.signer,
    );
    if (unwrapped) {
      savePrivateEvent(
        unwrapped.rawEvent() as unknown as NostrEvent,
        event.rawEvent() as unknown as NostrEvent,
      );
      return unwrapped?.rawEvent() as unknown as NostrEvent;
    }

    return null;
  });
  return useLiveQuery(() => db.dms.toArray(), [], []);
}

export function useGroupDirectMessages(group: Group) {
  const pubkey = usePubkey();
  const groupRelays = useGroupRelays(group);
  const myGroupRelays = groupRelays
    .filter((r) => r)
    .find((r) => r!.pubkey === pubkey);
  const ndk = useNDK();
  useEffect(() => {
    if (groupRelays) {
      console.log("forcing connect and auth420", groupRelays);
      const filter = {
        kinds: [NDKKind.GiftWrap],
        "#p": [pubkey!],
        limit: 1,
      };
      ndk
        .fetchEvent(
          filter,
          { groupable: false, closeOnEose: true },
          NDKRelaySet.fromRelayUrls(
            myGroupRelays?.dm || myGroupRelays?.fallback || [],
            ndk,
          ),
        )
        .then(() => console.log("connected and auth420"));
    }
  }, [groupRelays]);
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
      const dms = await db.dms.toArray();
      return Array.from(new Set(dms.map((dm) => dm.group)))
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
                : splitIntoChunks(id, 64).filter((p) => p !== pubkey),
          };
        })
        .filter((g) => g.pubkeys.length > 0);
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
      const messages = await db.dms
        .where("group")
        .equals(id)
        .sortBy("created_at");
      return messages.reverse();
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
  const [memoized, setMemoized] = useState<LastSeen | null>(null);
  useEffect(() => {
    getLastSeen(group).then((lastSeen) => {
      if (lastSeen) {
        setMemoized(lastSeen);
      }
    });
  }, [group.id]);
  return memoized;
}

export function useUnreads(groups: Group[]) {
  return useLiveQuery(
    async () => {
      const unreads = await Promise.all(
        groups.map((g) => getUnreadMessages(g)),
      );
      return groups
        .map((g, idx) => ({ group: g, count: unreads[idx] }))
        .filter((u) => u.count > 0);
    },
    [],
    [],
  );
}

export function useUnreadMessages(group: Group) {
  return useLiveQuery(() => getUnreadMessages(group), [group.id]);
}

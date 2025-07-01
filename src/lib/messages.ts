import { useEffect, useState } from "react";
import { useAtomValue } from "jotai";
import { useLiveQuery } from "dexie-react-hooks";
import {
  NDKEvent,
  NDKKind,
  NDKRelaySet,
  NDKSubscription,
  NDKSubscriptionCacheUsage,
} from "@nostr-dev-kit/ndk";
import { NostrEvent } from "nostr-tools";
import { groupsAtom } from "@/app/store";
import { useNDK } from "@/lib/ndk";
import { useRelaySet } from "@/lib/nostr";
import { usePubkey } from "@/lib/account";
import { groupId } from "@/lib/groups";
import {
  getGroupEvents,
  getLastGroupMessage,
  getGroupsSortedByLastMessage,
  getLastSeen,
  getUnreadMessages,
  getUnreadMentions,
  getGroupChatParticipants,
} from "@/lib/messages/queries";
import db, { cache } from "@/lib/db";
import { Group } from "@/lib/types";
import { DELETE_GROUP, RELATIONSHIP } from "@/lib/kinds";
import { LastSeen } from "@/lib/db";
import { useCommunity } from "./nostr/groups";

export function saveGroupEvent(event: NostrEvent, group: Group) {
  const record = {
    id: event.id,
    kind: event.kind,
    created_at: event.created_at,
    content: event.content,
    tags: event.tags,
    pubkey: event.pubkey,
    group: groupId(group),
  };
  db.events.put(record);
  cache.discardUnpublishedEvent(event.id);
}

export function saveLastSeen(ev: NostrEvent, group: Group) {
  const ndkEvent = new NDKEvent(undefined, ev);
  const [tag, ref] = ndkEvent.tagReference();
  db.lastSeen.put({
    group: groupId(group),
    kind: ev.kind,
    created_at: ev.created_at,
    tag,
    ref,
  });
}

export function useGroupchat(group: Group) {
  const ndk = useNDK();
  const relaySet = useRelaySet([group.relay]);
  const groups = useAtomValue(groupsAtom);
  const groupIds = groups.map(groupId);
  const isSubbed = groupIds.includes(groupId(group));

  useEffect(() => {
    if (isSubbed) return;

    let sub: NDKSubscription | undefined;
    getLastGroupMessage(group).then((last) => {
      const filter = {
        kinds: [
          NDKKind.GroupChat,
          NDKKind.GroupAdminAddUser,
          NDKKind.GroupAdminRemoveUser,
          DELETE_GROUP,
          NDKKind.Nutzap,
          RELATIONSHIP,
        ],
        "#h": [group.id],
        ...(last ? { since: last.created_at + 1 } : {}),
      };
      sub = ndk.subscribe(
        filter,
        {
          cacheUsage: NDKSubscriptionCacheUsage.ONLY_RELAY,
          groupable: false,
          closeOnEose: false,
        },
        relaySet,
      );

      sub.on("event", (event) => {
        saveGroupEvent(event.rawEvent() as NostrEvent, group);
      });
    });

    return () => {
      sub?.stop();
    };
  }, [isSubbed, group.id, group.relay]);

  return useLiveQuery(() => getGroupEvents(group), [group.id, group.relay], []);
}

export function useCommunitychat(pubkey: string) {
  const ndk = useNDK();
  const community = useCommunity(pubkey);
  const group = {
    id: pubkey,
    relay: community?.relay || "",
    isCommunity: true,
  };

  useEffect(() => {
    let sub: NDKSubscription | undefined;
    if (!community) return;

    getLastGroupMessage(group).then((last) => {
      const relays = [community.relay, ...(community.backupRelays || [])];
      const relaySet = NDKRelaySet.fromRelayUrls(relays, ndk);
      const filter = {
        kinds: [NDKKind.GroupChat, NDKKind.Nutzap, RELATIONSHIP],
        "#h": [pubkey],
        ...(last ? { since: last.created_at } : {}),
      };
      sub = ndk.subscribe(
        filter,
        {
          cacheUsage: NDKSubscriptionCacheUsage.ONLY_RELAY,
          groupable: false,
          closeOnEose: false,
        },
        relaySet,
      );

      sub.on("event", (event) => {
        saveGroupEvent(event.rawEvent() as NostrEvent, group);
      });
    });

    return () => {
      sub?.stop();
    };
  }, [community]);

  return useLiveQuery(() => getGroupEvents(group), [group.id], []);
}

export function useLastMessage(group: Group) {
  return useLiveQuery(
    () => getLastGroupMessage(group),
    [group.id, group.relay],
  );
}

export function useLastSeen(group: Group) {
  const [memoized, setMemoized] = useState<LastSeen | null>(null);
  useEffect(() => {
    getLastSeen(group).then((lastSeen) => {
      if (lastSeen) {
        setMemoized(lastSeen);
      }
    });
  }, [group.id, group.relay]);
  return memoized;
}

export function useUnreads(groups: Group[]) {
  const me = usePubkey();
  return useLiveQuery(
    async () => {
      const unreads = await Promise.all(
        groups.map((g) => getUnreadMessages(g, me)),
      );
      return groups
        .map((group, idx) => ({ group, count: unreads[idx] }))
        .filter((u) => u.count > 0);
    },
    [groups, me],
    [],
  );
}

export function useUnreadMessages(group: Group) {
  const me = usePubkey();
  return useLiveQuery(
    () => getUnreadMessages(group, me),
    [group.id, group.relay, me],
  );
}

export function useUnreadMentions(group: Group) {
  const me = usePubkey();
  return useLiveQuery(async () => {
    if (me) return getUnreadMentions(group, me);
    return [];
  }, [group.id, group.relay, me ? me : "anon"]);
}

// todo: sync last seen over nostr

export function useNewMessage(group: Group) {
  return (ev: NostrEvent) => {
    saveGroupEvent(ev, group);
    saveLastSeen(ev, group);
  };
}

export function useSortedGroups() {
  const groups = useAtomValue(groupsAtom);
  return useLiveQuery(
    () => getGroupsSortedByLastMessage(groups),
    groups,
    groups,
  );
}

export function useSaveLastSeen(group: Group) {
  return () => {
    getLastGroupMessage(group).then((ev) => {
      if (ev) {
        // @ts-expect-error db events are unsigned
        saveLastSeen(ev, group);
      }
    });
  };
}

export function useMembers(group?: Group) {
  return useLiveQuery(
    () => {
      if (group) {
        return getGroupChatParticipants(group);
      }
      return [];
    },
    [group?.id, group?.relay],
    [],
  );
}

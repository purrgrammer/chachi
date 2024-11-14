import { useEffect } from "react";
import { useAtomValue } from "jotai";
import { useLiveQuery } from "dexie-react-hooks";
import {
  NDKEvent,
  NDKKind,
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
  getGroupChat,
  getLastGroupMessage,
  getGroupsSortedByLastMessage,
  getLastSeen,
  getUnreadMessages,
  getUnreadMentions,
  getGroupChatParticipants,
} from "@/lib/messages/queries";
import { Group } from "@/lib/types";
import db from "@/lib/db";

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
    if (isSubbed) {
      return;
    }

    let sub: NDKSubscription | undefined;
    getLastGroupMessage(group).then((last) => {
      const filter = {
        kinds: [
          NDKKind.GroupChat,
          NDKKind.GroupAdminAddUser,
          NDKKind.GroupAdminRemoveUser,
        ],
        "#h": [group.id],
        ...(last ? { since: last.created_at } : {}),
      };
      sub = ndk.subscribe(
        filter,
        {
          cacheUsage: NDKSubscriptionCacheUsage.ONLY_RELAY,
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
  }, [group.id, group.relay, isSubbed]);

  return useLiveQuery(() => getGroupChat(group), [group.id, group.relay], []);
}

export function useLastMessage(group: Group) {
  return useLiveQuery(
    () => getLastGroupMessage(group),
    [group.id, group.relay],
  );
}

export function useLastSeen(group: Group, kind = NDKKind.GroupChat) {
  return useLiveQuery(
    () => getLastSeen(group, kind),
    [group.id, group.relay, kind],
  );
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
  return useLiveQuery(() => getUnreadMessages(group), [group.id, group.relay]);
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

export function useMembers(group: Group) {
  return useLiveQuery(
    () => getGroupChatParticipants(group),
    [group.id, group.relay],
    [],
  );
}

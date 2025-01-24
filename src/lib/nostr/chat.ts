import { useState, useEffect } from "react";
import type { NostrEvent } from "nostr-tools";
import {
  NDKKind,
  NDKRelaySet,
  NDKSubscription,
  NDKSubscriptionCacheUsage,
} from "@nostr-dev-kit/ndk";
import { useNDK } from "@/lib/ndk";
import { saveGroupEvent } from "@/lib/messages";
import { getLastGroupMessage } from "@/lib/messages/queries";
import { useStream } from "@/lib/nostr";
import type { Group } from "@/lib/types";
import { DELETE_GROUP } from "@/lib/kinds";

export function useDeletions(group: Group) {
  return useStream(
    {
      kinds: [NDKKind.EventDeletion, 9005 as NDKKind],
      "#h": [group.id],
    },
    [group.relay],
  );
}

export function useGroupMessages(groups: Group[]) {
  const ndk = useNDK();
  const [subs, setSubs] = useState<NDKSubscription[]>([]);
  useEffect(() => {
    for (const group of groups) {
      const { id, relay } = group;
      getLastGroupMessage(group).then((lastMessage) => {
        const relaySet = NDKRelaySet.fromRelayUrls([relay], ndk);
        let sub: NDKSubscription | undefined;
        const filter = {
          kinds: [
            NDKKind.GroupChat,
            NDKKind.GroupAdminAddUser,
            NDKKind.GroupAdminRemoveUser,
            DELETE_GROUP,
          ],
          "#h": [id],
          ...(lastMessage ? { since: lastMessage.created_at } : {}),
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
          // todo: check that event.h is the same as group.id
          // todo: check that event.h relay is the group relay
          if (event.tags.find((tag) => tag[0] === "h" && tag[1] === group.id)) {
            saveGroupEvent(event.rawEvent() as NostrEvent, group);
          }
        });

        setSubs((subs) => [...subs, sub as NDKSubscription]);
      });
    }

    return () => {
      for (const sub of subs) sub.stop();
      setSubs([]);
    };
  }, [groups]);
}

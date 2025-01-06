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
import { groupBy } from "@/lib/utils";
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
  const byRelay = groupBy(groups, (g: Group) => g.relay);
  useEffect(() => {
    for (const [relay, gs] of Object.entries(byRelay)) {
      const lastMessages = (gs as Group[]).map(getLastGroupMessage);
      const relaySet = NDKRelaySet.fromRelayUrls([relay], ndk);
      let sub: NDKSubscription | undefined;
      Promise.all(lastMessages).then((lasts) => {
        const filters = (gs as Group[]).map((group, i) => {
          return {
            kinds: [
              NDKKind.GroupChat,
              NDKKind.GroupAdminAddUser,
              NDKKind.GroupAdminRemoveUser,
              DELETE_GROUP,
            ],
            "#h": [group.id],
            ...(lasts[i] ? { since: lasts[i].created_at } : {}),
          };
        });
        sub = ndk.subscribe(
          filters,
          {
            cacheUsage: NDKSubscriptionCacheUsage.ONLY_RELAY,
            groupable: false,
            closeOnEose: false,
          },
          relaySet,
        );

        sub.on("event", (event) => {
          const h = event.tagValue("h");
          const group = { id: h, relay } as Group;
          saveGroupEvent(event.rawEvent() as NostrEvent, group);
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

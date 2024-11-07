import { useMemo, useState, useEffect } from "react";
import type { NostrEvent } from "nostr-tools";
import { useQuery } from "@tanstack/react-query";
import {
  NDKKind,
  NDKRelaySet,
  NDKSubscription,
  NDKSubscriptionCacheUsage,
} from "@nostr-dev-kit/ndk";
import { useNDK } from "@/lib/ndk";
import { saveGroupEvent } from "@/lib/messages";
import { getLastGroupMessage } from "@/lib/messages/queries";
import { useStream, useRelaySet } from "@/lib/nostr";
import { groupBy } from "@/lib/utils";
import type { Group, Relay } from "@/lib/types";

export function useLastMessage(group: Group) {
  const ndk = useNDK();
  const relaySet = useMemo(() => {
    return NDKRelaySet.fromRelayUrls([group.relay], ndk);
  }, [group.relay]);
  const [event, setEvent] = useState<NostrEvent | null>(null);

  useEffect(() => {
    const sub = ndk.subscribe(
      {
        kinds: [NDKKind.GroupChat, NDKKind.GroupReply],
        "#h": [group.id],
        limit: 1,
      },
      {
        cacheUsage: NDKSubscriptionCacheUsage.ONLY_RELAY,
        groupable: false,
        closeOnEose: false,
      },
      relaySet,
    );

    sub.on("event", (ev) => {
      if (ev.created_at && ev.created_at > (event?.created_at || 0)) {
        setEvent(ev.rawEvent() as NostrEvent);
      }
    });

    return () => {
      sub.stop();
    };
  }, [group.id]);

  return event;
}

export function useRelayChat(relay: Relay, channel: string) {
  return useStream(
    {
      kinds: [209 as NDKKind],
      "#~": [channel],
    },
    [relay.url],
  );
}

export function useRelayChannels(relay: Relay) {
  // todo: query
  const ndk = useNDK();
  const relaySet = useRelaySet([relay.url]);
  return useQuery({
    queryKey: ["relay-channels", relay.url],
    queryFn: async () => {
      const events = await ndk.fetchEvents(
        {
          kinds: [209 as NDKKind],
        },
        {
          closeOnEose: true,
        },
        relaySet,
      );
      return Array.from(events).reduce((acc, event) => {
        const channel = event.tags.find((tag) => tag[0] === "~")?.[1]?.trim();
        if (!channel || acc.includes(channel)) return acc;
        acc.push(channel);
        return acc;
      }, [] as string[]);
    },
  });
}

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
            ],
            "#h": [group.id],
            ...(lasts[i] ? { since: lasts[i].created_at } : {}),
          };
        });
        sub = ndk.subscribe(
          filters,
          {
            cacheUsage: NDKSubscriptionCacheUsage.ONLY_RELAY,
            closeOnEose: false,
          },
          relaySet,
        );

        sub.on("event", (event) => {
          const h = event.tagValue("h");
          // todo: if no relay is an event we sent client side, dismiss it
          if (event.relay) {
            const group = { id: h, relay: event.relay!.url } as Group;
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

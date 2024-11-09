import { useState, useEffect } from "react";
import { useAtomValue } from "jotai";
import { useQuery, useQueries } from "@tanstack/react-query";
import { nip19 } from "nostr-tools";
import { NostrEvent } from "nostr-tools";
import { insertEventIntoDescendingList } from "nostr-tools/utils";
import NDK, {
  NDKEvent,
  NDKKind,
  NDKRelaySet,
  NDKFilter,
  NDKSubscriptionCacheUsage,
} from "@nostr-dev-kit/ndk";
import { relaysAtom } from "@/app/store";
import { useNDK } from "@/lib/ndk";
import { isRelayURL } from "@/lib/relay";
import { EVENT, ADDRESS, PROFILE, RELAY_LIST } from "@/lib/query";

interface NostrREQResult {
  events: NostrEvent[];
  eose: boolean;
}

// fixme: can't add items to a closed subscription
export function useRelaySet(relays: string[]): NDKRelaySet | undefined {
  const ndk = useNDK();
  const relayUrls = relays.filter(isRelayURL);
  return relayUrls.length > 0 && ndk
    ? NDKRelaySet.fromRelayUrls(relayUrls, ndk)
    : undefined;
}

// todo: rename useEventId
export function useEvent({ id, relays }: { id?: string; relays: string[] }) {
  const ndk = useNDK();
  // fixme: fallback to big public relays like nostr.band when not found
  const relaySet = useRelaySet(relays.concat(["wss://relay.nostr.band"]));

  return useQuery({
    queryKey: [EVENT, id ? id : "empty"],
    queryFn: () => {
      if (!id) return null;
      return ndk
        .fetchEvent(
          { ids: [id] },
          {
            groupable: false,
            cacheUsage: NDKSubscriptionCacheUsage.CACHE_FIRST,
          },
          relaySet,
        )
        .then((ev) => {
          if (ev) {
            return ev.rawEvent() as NostrEvent;
          }
          throw new Error("Can't find event");
        });
    },
    staleTime: Infinity,
  });
}

export function useAddress({
  pubkey,
  kind,
  identifier,
  relays,
}: {
  pubkey: string;
  kind: number;
  identifier: string;
  relays: string[];
}) {
  const ndk = useNDK();
  const relaySet = useRelaySet(relays);

  // todo: tweak staleTime, get latest
  return useQuery({
    queryKey: [ADDRESS, `${kind}:${pubkey}:${identifier}`],
    queryFn: () => {
      return ndk
        .fetchEvent(
          { kinds: [kind], authors: [pubkey], "#d": [identifier] },
          {
            closeOnEose: true,
            cacheUsage: NDKSubscriptionCacheUsage.CACHE_FIRST,
          },
          relaySet,
        )
        .then((ev) => {
          if (ev) {
            return ev.rawEvent() as NostrEvent;
          }
          throw new Error("Can't find address");
        });
    },
    staleTime: Infinity,
  });
}

export function useERef(tag: string[]) {
  const [, id, relay] = tag;
  return useEvent({ id, relays: relay && isRelayURL(relay) ? [relay] : [] });
}

export function useARef(tag: string[]) {
  const [, aRef, aRelay] = tag;
  const [kind, pubkey, identifier] = aRef.split(":");
  return useAddress({
    pubkey,
    kind: Number(kind),
    identifier,
    relays: aRelay ? [aRelay] : [],
  });
}

export function useNostrLink(nlink: string) {
  const ndk = useNDK();
  const userRelays = useRelays();
  const [event, setEvent] = useState<NostrEvent | null>(null);
  const [relays, setRelays] = useState<string[]>([]);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    try {
      const decoded = nip19.decode(nlink);
      if (decoded.type === "nevent") {
        const relays = decoded.data.relays ?? [];
        setRelays(relays);
        ndk
          .fetchEvent(
            {
              ...(decoded.data.kind ? { kinds: [decoded.data.kind] } : {}),
              ...(decoded.data.author
                ? { authors: [decoded.data.author] }
                : {}),
              ids: [decoded.data.id],
            },
            {
              closeOnEose: true,
              cacheUsage: NDKSubscriptionCacheUsage.CACHE_FIRST,
            },
            NDKRelaySet.fromRelayUrls(relays, ndk),
          )
          .then((ev) => {
            if (ev) {
              setEvent(ev.rawEvent() as NostrEvent);
            }
          });
      } else if (decoded.type === "naddr") {
        const relays = decoded.data.relays ?? [];
        setRelays(relays);
        ndk
          .fetchEvent(
            {
              ...(decoded.data.kind ? { kinds: [decoded.data.kind] } : {}),
              authors: [decoded.data.pubkey],
              "#d": [decoded.data.identifier],
            },
            {
              closeOnEose: true,
              cacheUsage: NDKSubscriptionCacheUsage.CACHE_FIRST,
            },
            NDKRelaySet.fromRelayUrls(relays, ndk),
          )
          .then((ev) => {
            if (ev) {
              setEvent(ev.rawEvent() as NostrEvent);
            }
          });
      } else if (decoded.type === "note") {
        const relays = userRelays;
        setRelays(relays ? relays : []);
        ndk
          .fetchEvent(
            {
              ids: [decoded.data],
            },
            {
              closeOnEose: true,
              cacheUsage: NDKSubscriptionCacheUsage.CACHE_FIRST,
            },
            NDKRelaySet.fromRelayUrls(relays, ndk),
          )
          .then((ev) => {
            if (ev) {
              setEvent(ev.rawEvent() as NostrEvent);
            }
          });
      }
    } catch (err) {
      console.error(err);
      setError(err as Error);
    }
  }, [nlink]);

  return { event, relays, error };
}

export function useStream(
  filter: NDKFilter | NDKFilter[],
  relays: string[],
  live = true,
  onlyRelays = false,
): NostrREQResult {
  const ndk = useNDK();
  const relaySet = useRelaySet(relays);
  const [eose, setEose] = useState(false);
  const [events, setEvents] = useState<NostrEvent[]>([]);

  useEffect(() => {
    const sub = ndk.subscribe(
      filter,
      {
        cacheUsage: onlyRelays
          ? NDKSubscriptionCacheUsage.ONLY_RELAY
          : live
            ? NDKSubscriptionCacheUsage.PARALLEL
            : NDKSubscriptionCacheUsage.ONLY_CACHE,
        closeOnEose: !live,
      },
      relaySet,
    );

    sub.on("event", (event) => {
      setEvents((events) => {
        const newEvents = [...events];
        insertEventIntoDescendingList(
          newEvents,
          event.rawEvent() as NostrEvent,
        );
        return newEvents;
      });
    });

    sub.on("eose", () => {
      setEose(true);
    });

    return () => sub.stop();
  }, [live]);

  return { events, eose };
}

export function useRequest(
  filter: NDKFilter | NDKFilter[],
  relays: string[],
): NostrREQResult {
  const ndk = useNDK();
  const relaySet = useRelaySet(relays);
  const [eose, setEose] = useState(false);
  const [events, setEvents] = useState<NostrEvent[]>([]);

  useEffect(() => {
    const sub = ndk.subscribe(
      filter,
      {
        closeOnEose: true,
      },
      relaySet,
    );

    sub.on("event", (event) => {
      setEvents((events) => {
        return events.concat([event.rawEvent() as NostrEvent]);
      });
    });

    sub.on("eose", () => {
      setEose(true);
    });

    return () => sub.stop();
  }, []);

  return { events, eose };
}

// Users

function fetchProfile(ndk: NDK, pubkey: string, relays: string[]) {
  // todo: use NDK helpers to fech profile
  return ndk
    .fetchEvent(
      {
        kinds: [NDKKind.Metadata],
        authors: [pubkey],
      },
      { closeOnEose: true, cacheUsage: NDKSubscriptionCacheUsage.CACHE_FIRST },
      NDKRelaySet.fromRelayUrls(
        relays.length > 0
          ? relays
          : ["wss://purplepag.es", "wss://relay.nostr.band"],
        ndk,
      ),
    )
    .then((ev) => {
      if (ev) {
        return { ...JSON.parse(ev.content), pubkey };
      }
      return null;
    })
    .catch((err) => {
      console.error(err);
      return null;
    });
}

export function useProfiles(pubkeys: string[]) {
  const ndk = useNDK();
  return useQueries({
    queries: pubkeys.map((pubkey) => {
      return {
        queryKey: [PROFILE, pubkey],
        queryFn: () => fetchProfile(ndk, pubkey, ["wss://purplepag.es"]),
        staleTime: Infinity,
      };
    }),
  });
}

export function useProfile(pubkey: string, relays: string[] = []) {
  const ndk = useNDK();

  // todo: use user#fetchProfile?
  return useQuery({
    queryKey: [PROFILE, pubkey],
    queryFn: () => {
      return fetchProfile(ndk, pubkey, relays);
    },
    staleTime: Infinity,
    gcTime: 1 * 60 * 1000,
  });
}

export function useRelayList(pubkey: string) {
  const ndk = useNDK();
  const relaySet = useRelaySet(["wss://purplepag.es"]);

  return useQuery({
    queryKey: [RELAY_LIST, pubkey],
    queryFn: async () => {
      return await ndk
        .fetchEvent(
          {
            kinds: [NDKKind.RelayList],
            authors: [pubkey],
          },
          undefined,
          relaySet,
        )
        .then((ev) => {
          if (ev) {
            return ev.tags.filter((t) => t[0] === "r").map((t) => t[1]);
          }
          throw new Error("Can't find relay list");
        });
    },
    staleTime: Infinity,
    gcTime: 5 * 60 * 1000,
  });
}

// Reactions

export function useReactions(
  event: NostrEvent,
  kinds: NDKKind[] = [NDKKind.Reaction],
  relays: string[],
  live = true,
) {
  const ndk = useNDK();
  return useStream(
    {
      kinds,
      ...new NDKEvent(ndk, event).filter(),
    },
    relays,
    live,
  );
}

// Relays

export function useRelays() {
  const relays = useAtomValue(relaysAtom);
  return relays.map((r) => r.url);
}

import { useMemo, useState, useEffect } from "react";
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
import {
  isRelayURL,
  discoveryRelays,
  profileRelays,
  fallbackRelays,
} from "@/lib/relay";
import { EVENT, ADDRESS, PROFILE, RELAY_LIST } from "@/lib/query";
import db from "@/lib/db";

interface NostrREQResult<A> {
  events: A[];
  eose: boolean;
}

// fixme: can't add items to a closed subscription
export function useRelaySet(relays: string[]): NDKRelaySet | undefined {
  const ndk = useNDK();
  const relayUrls = relays.filter(isRelayURL);
  const relaySet = useMemo(() => {
    return relayUrls.length > 0 && ndk
      ? NDKRelaySet.fromRelayUrls(relayUrls, ndk)
      : undefined;
  }, [relayUrls]);
  return relaySet;
}

async function fetchCachedEvent(ndk: NDK, id: string) {
  const stored = await db.events.get(id);
  if (stored) {
    return stored as unknown as NostrEvent;
  }
  return ndk
    .fetchEvent(
      { ids: [id] },
      {
        closeOnEose: true,
        cacheUsage: NDKSubscriptionCacheUsage.ONLY_CACHE,
      },
    )
    .then((ev) => {
      if (ev) {
        return ev.rawEvent() as NostrEvent;
      }
      return null;
    });
}

// todo: rename useEventId
export function useEvent({
  id,
  pubkey,
  relays,
}: {
  id?: string;
  pubkey?: string;
  relays: string[];
}) {
  const ndk = useNDK();
  return useQuery({
    enabled: Boolean(id),
    queryKey: [EVENT, id ? id : "empty"],
    queryFn: async () => {
      if (!id) throw new Error("No id");

      const cached = await fetchCachedEvent(ndk, id);
      if (cached) {
        return cached;
      }

      const relayList =
        pubkey && relays.length === 0
          ? await fetchRelayList(ndk, pubkey)
          : relays.length > 0
            ? relays
            : null;

      const relaySet = relayList
        ? NDKRelaySet.fromRelayUrls(relayList, ndk)
        : undefined;

      return ndk
        .fetchEvent(
          { ids: [id], ...(pubkey ? { authors: [pubkey] } : {}) },
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
          return null;
        });
    },
    staleTime: Infinity,
    gcTime: 0,
  });
}

function fetchCachedAddress(
  ndk: NDK,
  kind: number,
  pubkey: string,
  identifier: string,
) {
  return ndk
    .fetchEvent(
      {
        kinds: [kind],
        authors: [pubkey],
        ...(kind >= 30_0000 && kind <= 40_000 ? { "#d": [identifier] } : {}),
      },
      {
        closeOnEose: true,
        cacheUsage: NDKSubscriptionCacheUsage.ONLY_CACHE,
      },
    )
    .then((ev) => {
      if (ev) {
        return ev.rawEvent() as NostrEvent;
      }
      return null;
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

  // todo: tweak staleTime, get latest
  return useQuery({
    queryKey: [ADDRESS, `${kind}:${pubkey}:${identifier}`],
    queryFn: async () => {
      const cached = await fetchCachedAddress(ndk, kind, pubkey, identifier);
      if (cached) {
        return cached;
      }
      const relayList =
        relays.length === 0
          ? await fetchRelayList(ndk, pubkey)
          : relays.length > 0
            ? relays
            : fallbackRelays;
      const relaySet = NDKRelaySet.fromRelayUrls(relayList, ndk);
      return ndk
        .fetchEvent(
          {
            kinds: [kind],
            authors: [pubkey],
            ...(kind >= 30_0000 && kind <= 40_000
              ? { "#d": [identifier] }
              : {}),
          },
          {
            closeOnEose: true,
            cacheUsage: NDKSubscriptionCacheUsage.ONLY_RELAY,
          },
          relaySet,
        )
        .then((ev) => {
          if (ev) {
            return ev.rawEvent() as NostrEvent;
          }
          return null;
        });
    },
    staleTime: Infinity,
    gcTime: 0,
  });
}

export function useTag(tag: string[]) {
  const [t] = tag;
  if (t === "e") {
    return useERef(tag);
  } else {
    return useARef(tag);
  }
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
  onlyRelays = true,
): NostrREQResult<NostrEvent> {
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
        skipOptimisticPublishEvent: true,
        closeOnEose: !live,
      },
      relaySet,
    );

    sub.on("event", (event) => {
      setEvents((events) => {
        const newEvents = [...events];
        const rawEvent = event.rawEvent() as NostrEvent;
        insertEventIntoDescendingList(newEvents, rawEvent);
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
): NostrREQResult<NostrEvent> {
  const ndk = useNDK();
  const relaySet = useRelaySet(relays);
  const [eose, setEose] = useState(false);
  const [events, setEvents] = useState<NostrEvent[]>([]);

  useEffect(() => {
    const sub = ndk.subscribe(
      filter,
      {
        closeOnEose: true,
        skipOptimisticPublishEvent: true,
        cacheUsage: NDKSubscriptionCacheUsage.ONLY_RELAY,
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

export function fetchProfile(ndk: NDK, pubkey: string, relays: string[]) {
  // todo: use NDK helpers to fech profile
  return ndk
    .fetchEvent(
      {
        kinds: [NDKKind.Metadata],
        authors: [pubkey],
      },
      { closeOnEose: true, cacheUsage: NDKSubscriptionCacheUsage.ONLY_RELAY },
      NDKRelaySet.fromRelayUrls(
        relays.length > 0 ? relays : profileRelays,
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
        queryFn: () => fetchProfile(ndk, pubkey, profileRelays),
        staleTime: Infinity,
        gcTime: 0,
      };
    }),
  });
}

export function useProfile(pubkey?: string, relays: string[] = []) {
  const ndk = useNDK();

  // todo: use user#fetchProfile?
  return useQuery({
    enabled: Boolean(pubkey),
    queryKey: [PROFILE, pubkey ? pubkey : "-"],
    queryFn: () => {
      return pubkey ? fetchProfile(ndk, pubkey, relays) : null;
    },
    staleTime: Infinity,
    gcTime: 0,
  });
}

export async function fetchRelayList(ndk: NDK, pubkey: string) {
  return await ndk
    .fetchEvent(
      {
        kinds: [NDKKind.RelayList],
        authors: [pubkey],
      },
      { closeOnEose: true, cacheUsage: NDKSubscriptionCacheUsage.ONLY_RELAY },
      NDKRelaySet.fromRelayUrls(discoveryRelays, ndk),
    )
    .then((ev) => {
      if (ev) {
        return ev.tags.filter((t) => t[0] === "r").map((t) => t[1]);
      }
      throw new Error("Can't find relay list");
    });
}

export function useRelayList(pubkey: string) {
  const ndk = useNDK();
  return useQuery({
    queryKey: [RELAY_LIST, pubkey],
    queryFn: () => fetchRelayList(ndk, pubkey),
    staleTime: Infinity,
    gcTime: 0,
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
  const filter = {
    kinds,
    ...new NDKEvent(ndk, event).filter(),
  };
  return useStream(filter, relays, live);
}

// Relays

export function useRelays() {
  const relays = useAtomValue(relaysAtom);
  return relays.map((r) => r.url);
}

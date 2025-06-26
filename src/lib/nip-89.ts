import { useMemo } from "react";
import { NostrEvent } from "nostr-tools";
import {
  NDKKind,
  NDKRelaySet,
  NDKSubscriptionCacheUsage,
} from "@nostr-dev-kit/ndk";
import { useQuery } from "@tanstack/react-query";
import { usePubkey, useFollows } from "@/lib/account";
import { useRelays } from "@/lib/nostr";
import { useNDK } from "@/lib/ndk";
import { Profile } from "@/lib/types";

export type AppRecommendation = {
  address: string;
  platform?: "android" | "ios" | "web";
  kinds: number[];
};

export function mergeAppRecommendations(
  recommendations: AppRecommendation[],
): AppRecommendation[] {
  const mergedMap = new Map<string, Set<number>>();

  recommendations.forEach(({ address, kinds }) => {
    if (!mergedMap.has(address)) {
      mergedMap.set(address, new Set(kinds));
    } else {
      kinds.forEach((kind) => mergedMap.get(address)!.add(kind));
    }
  });

  return Array.from(mergedMap.entries()).map(([address, kinds]) => ({
    address,
    kinds: Array.from(kinds),
  }));
}

export function useMyRecommendedApps() {
  const pubkey = usePubkey();
  const relays = useRelays();
  return useRecommendedApps(pubkey, relays);
}

export function useRecommendedApps(pubkey?: string, relays: string[] = []) {
  const ndk = useNDK();
  return useQuery({
    queryKey: ["recommended-apps", pubkey ? pubkey : "anonymous"],
    queryFn: async () => {
      if (!pubkey) {
        return [];
      }
      const apps = Array.from(
        await ndk.fetchEvents(
          {
            kinds: [NDKKind.AppRecommendation],
            authors: [pubkey],
          },
          {
            groupable: false,
            closeOnEose: true,
            cacheUsage: NDKSubscriptionCacheUsage.ONLY_RELAY,
          },
          NDKRelaySet.fromRelayUrls(relays, ndk),
        ),
      );
      const recommendations = apps.map((a) => ({
        address: a.tags.find((t) => t[0] === "a")?.[1] || "",
        platform: a.tags.find((t) => t[0] === "a")?.[3] as
          | "android"
          | "ios"
          | "web"
          | undefined,
        kinds: a.tags.filter((t) => t[0] === "d").map((t) => Number(t[1])),
      }));

      return mergeAppRecommendations(recommendations);
    },
  });
}

export function useAppDefinition(event: NostrEvent): Profile | null {
  const profile = useMemo(() => {
    try {
      return { pubkey: event.pubkey, ...JSON.parse(event.content) };
    } catch (error) {
      console.error("Failed to parse app definition content:", error);
      return null;
    }
  }, [event]);
  return profile;
}

export type AppRecommendationWithScore = {
  app: NostrEvent;
  pubkeys: Set<string>;
  score: number;
};

/**
 * Hook to get app recommendations for a specific event kind
 * Returns apps scored by how many follows recommend them (excluding self)
 */
export function useAppRecommendationsForKind(eventKind: number) {
  const ndk = useNDK();
  const relays = useRelays();
  const follows = useFollows();
  const currentUserPubkey = usePubkey();

  return useQuery({
    queryKey: ["app-recommendations-for-kind", eventKind, follows.length],
    queryFn: async (): Promise<AppRecommendationWithScore[]> => {
      // Step 1: Fetch recommendation events for this kind (kind 31989)
      const recommendationEvents = Array.from(
        await ndk.fetchEvents(
          {
            kinds: [NDKKind.AppRecommendation],
            "#d": [eventKind.toString()],
          },
          {
            groupable: false,
            closeOnEose: true,
            cacheUsage: NDKSubscriptionCacheUsage.ONLY_RELAY,
          },
          NDKRelaySet.fromRelayUrls(relays, ndk),
        ),
      );

      // Step 2: Create a record from app handler addresses to recommending pubkeys
      const addressToRecommenders = new Map<string, Set<string>>();

      for (const event of recommendationEvents) {
        const recommenderPubkey = event.pubkey;

        // Skip self recommendations
        if (recommenderPubkey === currentUserPubkey) {
          continue;
        }

        // Extract all 'a' tags (app handler addresses)
        const addressTags = event.tags.filter((tag) => tag[0] === "a");

        for (const addressTag of addressTags) {
          const address = addressTag[1];
          if (!address) continue;

          if (!addressToRecommenders.has(address)) {
            addressToRecommenders.set(address, new Set());
          }
          addressToRecommenders.get(address)!.add(recommenderPubkey);
        }
      }

      // Step 3: Score each app based on follows
      const followsSet = new Set(follows);
      const scoredApps = new Map<
        string,
        { pubkeys: Set<string>; score: number }
      >();

      for (const [address, recommenders] of addressToRecommenders) {
        // Count how many of our follows recommend this app
        const followRecommendations = Array.from(recommenders).filter(
          (pubkey) => followsSet.has(pubkey),
        );

        scoredApps.set(address, {
          pubkeys: recommenders,
          score: followRecommendations.length,
        });
      }

      // Step 4: Fetch app definitions for all addresses
      const addressesToFetch = Array.from(scoredApps.keys());

      if (addressesToFetch.length === 0) {
        return [];
      }

      // Parse addresses to get kind:pubkey:identifier format for app handler events (kind 31990)
      const appDefinitionFilters = addressesToFetch.map((address) => {
        const [, pubkey, identifier] = address.split(":");
        return {
          kinds: [31990], // App handler kind
          authors: [pubkey],
          "#d": [identifier || ""],
        };
      });

      // Fetch all app definitions
      const appDefinitionEvents = Array.from(
        await ndk.fetchEvents(
          appDefinitionFilters,
          {
            groupable: false,
            closeOnEose: true,
            cacheUsage: NDKSubscriptionCacheUsage.ONLY_RELAY,
          },
          NDKRelaySet.fromRelayUrls(relays, ndk),
        ),
      );

      // Step 5: Create final results
      const results: AppRecommendationWithScore[] = [];

      for (const event of appDefinitionEvents) {
        const dTag = event.tags.find((tag) => tag[0] === "d")?.[1] || "";
        const address = `31990:${event.pubkey}:${dTag}`;
        const scoredApp = scoredApps.get(address);

        if (scoredApp) {
          try {
            // Try to parse the app content to validate it's a valid app definition
            JSON.parse(event.content);

            results.push({
              app: event.rawEvent() as NostrEvent,
              pubkeys: scoredApp.pubkeys,
              score: scoredApp.score,
            });
          } catch (error) {
            console.warn(
              `Discarding app definition ${address} due to invalid JSON:`,
              error,
            );
            // Silently discard apps with unparseable content
          }
        }
      }

      // Step 6: Sort by score (highest first), then by pubkey for deterministic ordering, and slice top 10
      return results
        .sort((a, b) => {
          if (a.score !== b.score) {
            return b.score - a.score;
          }
          return a.app.pubkey.localeCompare(b.app.pubkey);
        })
        .slice(0, 10);
    },
    enabled: eventKind > 0,
  });
}

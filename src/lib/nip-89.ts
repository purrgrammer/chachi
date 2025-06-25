import { useMemo } from "react";
import { NostrEvent } from "nostr-tools";
import {
  NDKKind,
  NDKRelaySet,
  NDKSubscriptionCacheUsage,
} from "@nostr-dev-kit/ndk";
import { useQuery } from "@tanstack/react-query";
import { usePubkey } from "@/lib/account";
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

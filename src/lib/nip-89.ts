import {
  NDKKind,
  NDKRelaySet,
  NDKSubscriptionCacheUsage,
} from "@nostr-dev-kit/ndk";
import { useQuery } from "@tanstack/react-query";
import { useNDK } from "@/lib/ndk";

export type AppRecommendation = {
  address: string;
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

export function useRecommendedApps(pubkey: string, relays: string[]) {
  const ndk = useNDK();
  return useQuery({
    queryKey: ["recommended-apps", pubkey],
    queryFn: async () => {
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
        kinds: a.tags.filter((t) => t[0] === "d").map((t) => Number(t[1])),
      }));

      return mergeAppRecommendations(recommendations);
    },
  });
}

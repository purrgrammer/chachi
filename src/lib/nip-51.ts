import { NDKKind, NDKRelaySet } from "@nostr-dev-kit/ndk";
import { useQuery } from "@tanstack/react-query";
import { useNDK } from "@/lib/ndk";
import { fetchLatest } from "@/lib/nostr";

export function usePinnedPosts(pubkey: string, relays: string[]) {
  const ndk = useNDK();
  return useQuery({
    queryKey: ["pinned-posts", pubkey],
    queryFn: () =>
      fetchLatest(
        ndk,
        {
          kinds: [NDKKind.PinList],
          authors: [pubkey],
        },
        NDKRelaySet.fromRelayUrls(relays, ndk),
      ).then((e) => e?.tags.filter((t) => t[0] === "a" || t[0] === "e") || []),
  });
}

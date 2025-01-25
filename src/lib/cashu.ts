import { useQuery } from "@tanstack/react-query";
import { NDKEvent, NDKKind, NDKRelaySet } from "@nostr-dev-kit/ndk";
import { useNDK } from "@/lib/ndk";
import { CashuMint } from "@cashu/cashu-ts";
import { useRelayList } from "@/lib/nostr";

export function useMintInfo(url: string) {
  return useQuery({
    queryKey: ["cashu-mint", url],
    queryFn: () => CashuMint.getInfo(url),
  });
}

export function useMintList(pubkey: string) {
  const ndk = useNDK();
  const { data: relayList } = useRelayList(pubkey);
  return useQuery({
    enabled: Boolean(relayList),
    queryKey: ["mint-list", pubkey],
    queryFn: () =>
      ndk
        .fetchEvent(
          {
            kinds: [NDKKind.CashuMintList],
            authors: [pubkey],
          },
          {
            closeOnEose: true,
          },
          NDKRelaySet.fromRelayUrls(relayList || [], ndk),
        )
        .then((ev: NDKEvent | null) => {
          if (ev) {
            return ev.tags.filter((t) => t[0] === "mint").map((t) => t[1]);
          }
          throw new Error("No mint list found");
        }),
  });
}

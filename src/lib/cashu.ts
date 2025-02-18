import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { NDKEvent, NDKKind, NDKRelaySet } from "@nostr-dev-kit/ndk";
import { useNDK } from "@/lib/ndk";
import { CashuMint } from "@cashu/cashu-ts";
import { useRelays, useRelayList, useRequest } from "@/lib/nostr";
import { dedupeBy } from "@/lib/utils";
import { usePubkey } from "@/lib/account";

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
            console.log("CASHUMINTS", ev);
            const mints = ev.tags
              .filter((t) => t[0] === "mint")
              .map((t) => t[1]);
            const pubkey = ev.tags.find((t) => t[0] === "pubkey")?.[1];
            const relays = ev.tags
              .filter((t) => t[0] === "relay")
              .map((t) => t[1]);
            return { mints, pubkey, relays };
          }
          throw new Error("No mint list found");
        }),
  });
}

export function useSentNutzaps() {
  const pubkey = usePubkey();
  const relays = useRelays();
  const filter = {
    kinds: [NDKKind.Nutzap],
    authors: [pubkey!],
  };
  const { events } = useRequest(filter, relays);
  const sorted = useMemo(() => {
    const s = dedupeBy(events, "id");
    s.sort((a, b) => b.created_at - a.created_at);
    return s;
  }, [events]);
  return sorted;
}

export function useNutzaps(pubkey: string) {
  const { data: relayList } = useRelayList(pubkey);
  const { data: mintList } = useMintList(pubkey);
  const filter = {
    kinds: [NDKKind.Nutzap],
    "#p": [pubkey],
    ...(mintList ? { "#u": mintList.mints } : {}),
  };
  const relays = mintList ? mintList.relays : relayList || [];
  const { events } = useRequest(filter, relays);
  const sorted = useMemo(() => {
    const s = dedupeBy(events, "id");
    s.sort((a, b) => b.created_at - a.created_at);
    return s;
  }, [events]);
  return sorted;
}

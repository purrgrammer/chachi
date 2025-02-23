import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { NDKEvent, NDKKind, NDKRelaySet } from "@nostr-dev-kit/ndk";
import { useNDK } from "@/lib/ndk";
import { CashuMint, MintKeys, GetInfoResponse } from "@cashu/cashu-ts";
import { useRelays, useRelayList, useRequest } from "@/lib/nostr";
import { dedupeBy } from "@/lib/utils";
import { usePubkey } from "@/lib/account";
import { queryClient, MINT_INFO, MINT_KEYS, MINT_LIST } from "@/lib/query";

export function useMintInfo(url: string) {
  return useQuery({
    queryKey: [MINT_INFO, url],
    queryFn: () => CashuMint.getInfo(url),
    staleTime: 1000 * 60 * 60 * 24 * 7,
  });
}

// todo: cache in DB
export async function fetchMintInfo(url: string): Promise<GetInfoResponse> {
  return queryClient.fetchQuery({
    queryKey: [MINT_INFO, url],
    queryFn: () => CashuMint.getInfo(url),
    staleTime: 1000 * 60 * 60 * 24 * 7,
  });
}

export function useMintKeys(url: string) {
  return useQuery({
    queryKey: [MINT_KEYS, url],
    queryFn: async () => {
      const keys = await CashuMint.getKeys(url);
      return keys.keysets;
    },
    staleTime: 1000 * 60 * 60 * 24 * 7,
  });
}

// todo: cache in DB
export function fetchMintKeys(url: string): Promise<Array<MintKeys>> {
  return queryClient.fetchQuery({
    queryKey: [MINT_KEYS, url],
    queryFn: async () => {
      const keys = await CashuMint.getKeys(url);
      return keys.keysets;
    },
    staleTime: 1000 * 60 * 60 * 24 * 7,
  });
}

export function useMintList(pubkey: string) {
  const ndk = useNDK();
  const { data: relayList } = useRelayList(pubkey);
  return useQuery({
    enabled: Boolean(relayList),
    queryKey: [MINT_LIST, pubkey],
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

export function useRedeemedNutzaps(pubkey: string): Set<string> {
  const { data: relayList } = useRelayList(pubkey);
  const { data: mintList } = useMintList(pubkey);
  const relays = mintList ? mintList.relays : relayList || [];
  const filter = {
    kinds: [NDKKind.WalletChange],
    authors: [pubkey],
  };
  const { events } = useRequest(filter, relays);
  const redeemed = useMemo(() => {
    const redemptions = events
      .map((c) => c.tags.find((t) => t[0] === "e" && t[3] === "redeemed")?.[1])
      .filter(Boolean) as string[];
    return new Set(redemptions);
  }, [events]);
  return redeemed;
}

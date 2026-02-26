import { useAtomValue } from "jotai";
import { atomWithStorage, createJSONStorage } from "jotai/utils";
import { useQuery } from "@tanstack/react-query";
import {
  NDKEvent,
  NDKKind,
  NDKUser,
  NDKZapper,
} from "@nostr-dev-kit/ndk";
import { useStream, useRelays } from "@/lib/nostr";
import { NostrEvent } from "nostr-tools";
import { LNURL } from "@/lib/query";
import { usePubkey } from "@/lib/account";

export const HUGE_AMOUNT = 21_000;

// Record how many times we have used each amount to suggest it to the user
type ZapAmounts = Record<number, number>;
// todo: local-storage synced, store frequency, sort amounts by frequency

export const zapAmountsAtom = atomWithStorage<ZapAmounts>(
  "zap-amounts",
  {},
  createJSONStorage<ZapAmounts>(() => localStorage),
  { getOnInit: true },
);


export function useZapAmounts(): number[] {
  const amounts = useAtomValue(zapAmountsAtom);
  return Object.entries(amounts)
    .map(([amount, frequency]) => ({
      amount: parseInt(amount),
      frequency,
    }))
    .sort((a, b) => b.frequency - a.frequency)
    .map(({ amount }) => amount);
}

interface LNURLParams {
  status: "OK";
  allowsNostr?: boolean;
  nostrPubkey?: string;
  callback: string;
  minSendable: number;
  maxSendable: number;
  metadata: string;
  tag: "payRequest";
}

type LNURLResponse = { status: "ERROR"; reason?: string } | LNURLParams;

async function fetchLNURLParams(lud16: string) {
  const [name, domain] = lud16.split("@");
  const lnurlParams = (await fetch(
    `https://${domain}/.well-known/lnurlp/${name}`,
  ).then((res) => res.json())) as LNURLResponse;
  if (lnurlParams?.status === "ERROR") {
    if ("reason" in lnurlParams) {
      throw new Error(lnurlParams.reason);
    } else {
      throw new Error(`Failed to fetch LNURL params for ${lud16}`);
    }
  }
  return lnurlParams as LNURLParams;
}

export function useLNURLPay(lud16?: string) {
  return useQuery({
    enabled: !!lud16,
    queryKey: [LNURL, lud16 ? lud16 : "none"],
    queryFn: () => {
      return fetchLNURLParams(lud16!);
    },
    staleTime: 1000 * 60 * 30,
  });
}

export function fetchInvoice(
  lnurl: LNURLParams,
  amount: number,
  zap?: NostrEvent,
) {
  return fetch(
    `${lnurl.callback}?amount=${amount * 1000}${lnurl.allowsNostr && zap ? `&nostr=${encodeURI(JSON.stringify(zap))}` : ""}`,
  ).then((r) => r.json());
}





export function useReceivedZaps() {
  const pubkey = usePubkey();
  const relays = useRelays();
  const filter = {
    kinds: [NDKKind.Zap],
    "#p": [pubkey!],
    limit: 50,
  };
  return useStream(filter, relays, true, true);
}

interface ZapperConfig {
  relays: string[];
  tags: string[][];
}

export class Zapper extends NDKZapper {
  public config: ZapperConfig;

  constructor(
    target: NDKEvent | NDKUser,
    amount: number,
    options = {},
    config: ZapperConfig = { relays: [], tags: [] },
  ) {
    super(target, amount, "msat", options);
    this.config = config;
    this.tags = config.tags;
  }

  public async relays(): Promise<string[]> {
    return this.config.relays;
  }
}

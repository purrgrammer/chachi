import { useCallback, useEffect, useState } from "react";
import { useAtom, useAtomValue } from "jotai";
import { atomWithStorage, createJSONStorage } from "jotai/utils";
import { useQuery } from "@tanstack/react-query";
import {
  NDKEvent,
  NDKKind,
  NDKNutzap,
  NDKZapSplit,
  NDKUser,
  NDKZapper,
  NDKPaymentConfirmation,
} from "@nostr-dev-kit/ndk";
import { useMintList } from "@/lib/cashu";
import { useNDK } from "@/lib/ndk";
import { useRelaySet, useStream, useRelays } from "@/lib/nostr";
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

function increaseZapAmount(amounts: ZapAmounts, amount: number) {
  const n = amounts[amount] || 0;
  return { ...amounts, [amount]: n + 1 };
}

export function useIncreaseZapAmount() {
  const [, setAmounts] = useAtom(zapAmountsAtom);
  return useCallback(
    (amount: number) => {
      setAmounts((amounts) => increaseZapAmount(amounts, amount));
    },
    [setAmounts],
  );
}

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

function shuffle<T>(array: T[]): T[] {
  return array.sort(() => Math.random() - 0.5);
}

export function useNutzap(
  pubkey: string,
  relays: string[],
  event?: NostrEvent,
) {
  const ndk = useNDK();
  const myRelays = useRelays();
  const { data: mintList } = useMintList(pubkey);
  const relaySet = useRelaySet(Array.from(new Set(relays.concat(myRelays))));
  return useCallback(
    async (
      content: string,
      amount: number,
      tags: string[][],
      onZap: (z: NDKNutzap) => void,
    ) => {
      // todo: filter mint list for mints that can mitn tokens
      return new Promise(async (resolve, reject) => {
        try {
          if (!mintList) {
            reject("No mint list found");
            return;
          }
          if (!mintList?.pubkey) {
            reject("No P2PK pubkey found");
            return;
          }

          const zapped = event ? new NDKEvent(ndk, event) : null;
          const zapper = new Zapper(
            zapped ? zapped : new NDKUser({ pubkey }),
            Number(amount) * 1000,
            {
              comment: content,
              ndk,
              tags,
            },
            { relays, tags },
          );
          zapper.on("complete", (res) => {
            resolve(res);
          });
          const nutzap = await zapper.zapNip61(
            {
              amount: Number(amount) * 1000,
              pubkey,
            },
            {
              // @ts-expect-error: needed to override default comment
              paymentDescription: content,
              relays: mintList.relays,
              mints: shuffle(mintList.mints),
              p2pk: mintList.pubkey,
              allowIntramintFallback: true,
            },
          );
          if (nutzap instanceof NDKNutzap) {
            onZap(nutzap);
            nutzap.publish(relaySet);
          }
        } catch (err) {
          reject(err);
        }
      });
    },
    [pubkey, relays, event],
  );
}

export function useZap(pubkey: string, relays: string[], event?: NostrEvent) {
  const ndk = useNDK();
  return useCallback(
    async (
      content: string,
      amount: number,
      tags: string[][],
    ): Promise<
      Map<NDKZapSplit, NDKPaymentConfirmation | Error | undefined>
    > => {
      const zapped = event ? new NDKEvent(ndk, event) : null;
      const zapper = new Zapper(
        zapped ? zapped : new NDKUser({ pubkey }),
        Number(amount) * 1000,
        {
          comment: content,
          ndk,
          tags,
          nutzapAsFallback: true,
        },
        { relays, tags },
      );
      return zapper.zap();
    },
    [pubkey, relays, event],
  );
}

interface WebLNWallet {
  type: "webln";
  id: string;
  name: string;
  payInvoice: (invoice: string) => Promise<void>;
  isDefault?: boolean;
}

interface NWCWallet {
  type: "nwc";
  id: string;
  name: string;
  payInvoice: (invoice: string) => Promise<void>;
  isDefault?: boolean;
}

type Wallet = WebLNWallet | NWCWallet;

export function useWallets(): Wallet[] {
  const [isWebLnAvailable, setIsWebLnAvailable] = useState(false);

  useEffect(() => {
    if (window.webln) {
      setIsWebLnAvailable(true);
    }
  }, []);

  return [
    ...(isWebLnAvailable
      ? [
          //{
          //  type: "webln",
          //  id: 0,
          //  name: "WebLN",
          //  isDefault: false,
          //  payInvoice: (invoice: string) => window.webln.payInvoice(invoice),
          //},
        ]
      : []),
  ];
}

export function useSentZaps() {
  const pubkey = usePubkey();
  const relays = useRelays();
  const filter = {
    kinds: [NDKKind.Zap],
    "#P": [pubkey!],
    limit: 50,
  };
  return useStream(filter, relays, true, true);
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

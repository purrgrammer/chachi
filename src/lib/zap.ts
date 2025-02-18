import { useCallback, useEffect, useState } from "react";
import { useAtom, useAtomValue } from "jotai";
import { atomWithStorage, createJSONStorage } from "jotai/utils";
import { useQuery } from "@tanstack/react-query";
import {
  NDKEvent,
  NDKKind,
  NDKNutzap,
  NDKUser,
  NDKZapper,
  NDKSubscriptionCacheUsage,
} from "@nostr-dev-kit/ndk";
import { useMintList } from "@/lib/cashu";
import { useNDK } from "@/lib/ndk";
import { defaultMints } from "@/lib/wallet";
import { useRelaySet, useRelays } from "@/lib/nostr";
import { NostrEvent } from "nostr-tools";
import { LNURL } from "@/lib/query";
import { Zap, validateZap } from "@/lib/nip-57";

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
          const zapped = event ? new NDKEvent(ndk, event) : null;
          const zapper = new Zapper(
            zapped ? zapped : new NDKUser({ pubkey }),
            Number(amount) * 1000,
            {
              comment: content,
              ndk,
              tags,
            },
            { relays },
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
              relays: mintList?.relays || relays,
              mints: mintList ? shuffle(mintList.mints) : defaultMints,
              p2pk: mintList?.pubkey || pubkey,
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
  const myRelays = useRelays();
  const allRelays = Array.from(new Set(relays.concat(myRelays)));
  return useCallback(
    async (content: string, amount: number, tags: string[][]) => {
      return new Promise(async (resolve, reject) => {
        try {
          const zapped = event ? new NDKEvent(ndk, event) : null;
          const zapper = new Zapper(
            zapped ? zapped : new NDKUser({ pubkey }),
            Number(amount) * 1000,
            {
              comment: content,
              ndk,
              tags,
            },
            { relays: allRelays },
          );
          zapper.on("complete", (res) => {
            resolve(res);
          });
          zapper.zap().then(resolve);
        } catch (err) {
          reject(err);
        }
      });
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

export function useZaps(event: NostrEvent, relays: string[], live = true) {
  const ndk = useNDK();
  const relaySet = useRelaySet(relays);
  // todo: use user inbox relays too
  const [zaps, setZaps] = useState<Zap[]>([]);

  useEffect(() => {
    const filter = {
      kinds: [NDKKind.Zap],
      ...new NDKEvent(ndk, event).filter(),
    };
    const sub = ndk.subscribe(
      filter,
      {
        cacheUsage: NDKSubscriptionCacheUsage.PARALLEL,
        closeOnEose: !live,
      },
      relaySet,
    );

    sub.on("event", (event) => {
      const zap = validateZap(event.rawEvent() as NostrEvent);
      if (zap) {
        setZaps([...zaps, zap]);
      } else {
        console.warn("Invalid zap", event.rawEvent());
      }
    });

    return () => sub.stop();
  }, []);

  return zaps;
}

interface ZapperConfig {
  relays: string[];
}

export class Zapper extends NDKZapper {
  public config: ZapperConfig;

  constructor(
    target: NDKEvent | NDKUser,
    amount: number,
    options = {},
    config: ZapperConfig = { relays: [] },
  ) {
    super(target, amount, "msat", options);
    this.config = config;
  }

  public async relays(): Promise<string[]> {
    return this.config.relays;
  }
}

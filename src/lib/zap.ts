import { useCallback, useEffect, useState } from "react";
import { useAtom, useAtomValue } from "jotai";
import { atomWithStorage, createJSONStorage } from "jotai/utils";
import { useQuery } from "@tanstack/react-query";
import {
  NDKEvent,
  NDKKind,
  NDKSubscriptionCacheUsage,
} from "@nostr-dev-kit/ndk";
import { useNDK } from "@/lib/ndk";
import { useRelaySet } from "@/lib/nostr";
import { NostrEvent } from "nostr-tools";
import { LNURL } from "@/lib/query";
import { useGroup } from "@/lib/nostr/groups";
import type { Group } from "@/lib/types";
import { Zap, validateZap } from "@/lib/nip-57";

export const HUGE_AMOUNT = 21_000;

// Record how many times we have used each amount to suggest it to the user
type ZapAmounts = Record<number, number>;
// todo: local-storage synced, store frequency, sort amounts by frequency

interface ZapAmount {
  amount: number;
  frequency: number;
}

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

export function useZapAmounts(): ZapAmount[] {
  const amounts = useAtomValue(zapAmountsAtom);
  return Object.entries(amounts).map(([amount, frequency]) => ({
    amount: parseInt(amount),
    frequency,
  }));
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
  console.log("FETCHLNURL", lud16);
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

export function useZap(group: Group, pubkey: string, event?: NostrEvent) {
  const { data: metadata } = useGroup(group);
  const ndk = useNDK();
  const zap = useCallback(
    (content: string, amount: number, tags: string[][]) => {
      const zapped = event ? new NDKEvent(ndk, event) : null;
      // todo: a-tag zaps
      const [t, v] = zapped ? zapped.tagReference() : [];
      const ev = new NDKEvent(ndk, {
        kind: NDKKind.ZapRequest,
        content,
        tags: [
          ["relays", group.relay],
          ["p", pubkey],
          ["amount", String(amount * 1000)],
          ...tags,
          ...(t && v ? [[t, v]] : []),
        ],
      } as NostrEvent);
      // a-tag the group so in case `h` is not set in the receipt we can still find the zap
      if (metadata) {
        ev.tags.push([
          "a",
          `${NDKKind.GroupMetadata}:${metadata.pubkey}:${metadata.id}`,
          group.relay,
        ]);
      }
      return ev;
    },
    [pubkey, event],
  );
  return zap;
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

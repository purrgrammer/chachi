import { useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { atom, useAtom, useAtomValue } from "jotai";
import { useTranslation } from "react-i18next";
import { atomWithStorage, createJSONStorage } from "jotai/utils";
import { NostrEvent } from "nostr-tools";
import NDK, {
  NDKUser,
  NDKKind,
  NDKEvent,
  NDKRelaySet,
  NDKFilter,
  NDKSubscriptionCacheUsage,
} from "@nostr-dev-kit/ndk";
import {
  NDKWallet,
  NDKCashuWallet,
  NDKWebLNWallet,
  NDKNWCWallet,
} from "@nostr-dev-kit/ndk-wallet";
import { useNDK } from "@/lib/ndk";
import { usePubkey } from "@/lib/account";
import { useRelays, useRelaySet } from "@/lib/nostr";

type ChachiWallet =
  | { type: "nwc"; connection: string }
  | { type: "webln" }
  | { type: "nip60"; id: string };

export const walletAtom = atomWithStorage<NostrEvent | null>(
  "nutsack",
  null,
  createJSONStorage<NostrEvent | null>(() => localStorage),
  { getOnInit: true },
);
export const defaultWalletAtom = atomWithStorage<ChachiWallet | null>(
  "default-wallet",
  null,
  createJSONStorage<ChachiWallet | null>(() => localStorage),
  { getOnInit: true },
);
// todo: refactor to use this
export const activeWalletAtom = atom<NDKWallet | null>(null);

export const defaultMints = [
  "https://mint.bitcointxoko.com",
  "https://mint.coinos.io",
];

export function useChachiWallet() {
  const { t } = useTranslation();
  const ndk = useNDK();
  const ev = useAtomValue(walletAtom);
  const pubkey = usePubkey();
  const defaultWallet = useAtomValue(defaultWalletAtom);
  const [wallet, setWallet] = useAtom(activeWalletAtom);

  useEffect(() => {
    // todo: populate from default wallet
    if (
      ev &&
      pubkey &&
      defaultWallet &&
      defaultWallet.type === "nip60" &&
      ev.tags.find((t) => t[0] === "d" && t[1] === defaultWallet.id)
    ) {
      const event = new NDKEvent(ndk, ev);
      event.decrypt(new NDKUser({ pubkey }), ndk.signer, "nip44").then(() => {
        NDKCashuWallet.from(event)
          .then((w) => {
            if (!w) return;
            ndk.wallet = w;
            setWallet(w);
            //fixme: this is trying to /mint/bolt11 already minted tokens?
            w.start();
            const name = w.name || w.walletId || event.dTag;
            w.on("ready", () => toast.success(t("wallet.ready", { name })));
          })
          .catch((err) => {
            console.error(err);
            toast.error(t("wallet.sync-error"));
          });
      });
      return () => {
        if (wallet instanceof NDKCashuWallet) {
          wallet?.stop();
        }
      };
    } else if (defaultWallet?.type === "nwc") {
      const nwc = new NDKNWCWallet(ndk);
      nwc.initWithPairingCode(defaultWallet.connection).then(() => {
        setWallet(nwc);
      });
    } else if (defaultWallet?.type === "webln") {
      const w = new NDKWebLNWallet();
      setWallet(w);
    }
  }, [ev?.id, pubkey, defaultWallet]);

  return wallet;
}

export function useWallet() {
  return useAtomValue(activeWalletAtom);
}

type Direction = "in" | "out";

type Unit = "sat" | "msat" | "eur" | "usd";

export interface Transaction {
  id: string;
  created_at: number;
  unit: Unit;
  direction: Direction;
  amount: number;
  fee?: number;
  description?: string;
  mint: string;
  token: string;
  e?: string;
  p?: string;
}

function useStreamMap(
  filter: NDKFilter | NDKFilter[],
  relays: string[],
  transform: (ev: NostrEvent) => Promise<Transaction | null>,
) {
  const ndk = useNDK();
  const relaySet = useRelaySet(relays);
  const [events, setEvents] = useState<Transaction[]>([]);

  useEffect(() => {
    const sub = ndk.subscribe(
      filter,
      {
        cacheUsage: NDKSubscriptionCacheUsage.PARALLEL,
        closeOnEose: false,
        skipOptimisticPublishEvent: true,
      },
      relaySet,
    );

    sub.on("event", (event) => {
      const rawEvent = event.rawEvent() as NostrEvent;
      transform(rawEvent).then((ev) => {
        if (ev && !events.find((e) => e.id === ev.id)) {
          setEvents((evs) => [...evs, ev]);
        }
      });
    });

    return () => sub.stop();
  }, []);

  return events;
}

export function useTransactions(pubkey: string, wallet: NDKCashuWallet) {
  // todo: implement for NWC wallet
  // todo: implement for webln wallet
  const ndk = useNDK();
  return useStreamMap(
    {
      kinds: [NDKKind.WalletChange],
      authors: [pubkey],
      ...wallet.event!.filter(),
    },
    wallet.relays,
    async (ev: NostrEvent): Promise<Transaction | null> => {
      try {
        const event = new NDKEvent(ndk, ev);
        await event.decrypt(new NDKUser({ pubkey }), ndk.signer, "nip44");
        const tags = JSON.parse(event.content) as string[][];
        const direction = (tags.find((t) => t[0] === "direction")?.[1] ||
          "out") as Direction;
        const amount = tags.find((t) => t[0] === "amount")?.[1];
        const fee = tags.find((t) => t[0] === "fee")?.[1];
        const unit = tags.find((t) => t[0] === "unit")?.[1] ?? "sat";
        const mint = tags.find((t) => t[0] === "mint")?.[1];
        const description = tags.find((t) => t[0] === "description")?.[1];
        const e = tags.find(
          (t) => t[0] === "e" && !["created", "destroyed"].includes(t[3]),
        )?.[1];
        const token = tags.find(
          (t) => t[0] === "e" && ["created", "destroyed"].includes(t[3]),
        )?.[1];
        const p = tags.find((t) => t[0] === "p")?.[1];
        console.log("TX", tags);
        if (direction && amount && mint && token && unit) {
          return {
            id: ev.id,
            created_at: ev.created_at || 0,
            direction,
            amount: Number(amount),
            fee: fee ? Number(fee) : undefined,
            unit: (unit === "sats" ? "sat" : unit) as Unit,
            mint,
            description,
            e,
            token,
            p,
          };
        } else {
          console.warn("Invalid transaction", tags);
          return null;
        }
      } catch (err) {
        console.error(err);
        return null;
      }
    },
  );
}

// todo: compatible with NWC wallet
export function useDeposit() {
  const wallet = useWallet();
  const { t } = useTranslation();
  return useCallback(
    async (amount: number, onSuccess: () => void, onError: () => void) => {
      if (!wallet) throw new Error("No wallet");
      if (wallet instanceof NDKCashuWallet) {
        const deposit = wallet.deposit(amount, wallet.mints[1], wallet.unit);
        deposit.on("success", onSuccess);
        deposit.on("error", onError);
        return deposit.start();
      } else if (wallet instanceof NDKNWCWallet) {
        // @ts-expect-error: for some reason this does not typecheck
        const res = await wallet.makeInvoice(amount, t("wallet.deposit"));
        return res.invoice;
      } else {
        throw new Error("Deposit not supported for this wallet type");
      }
    },
    [wallet],
  );
}

export function useCreateWallet() {
  const ndk = useNDK();
  const [, setWallet] = useAtom(walletAtom);
  return async (name: string, relays: string[], mints: string[]) => {
    const wallet = NDKCashuWallet.create(
      ndk,
      mints ? mints : defaultMints,
      relays,
    );
    wallet.name = name;
    await wallet.getP2pk();
    await wallet.publish();
    if (wallet.event) {
      setWallet(wallet.event.rawEvent() as NostrEvent);
    }
    // todo: publish cashu mint list with mints, p2pk, and relays
  };
}

async function fetchCashuWallets(ndk: NDK, pubkey: string, relays: string[]) {
  return ndk
    .fetchEvents(
      {
        kinds: [NDKKind.CashuWallet],
        authors: [pubkey],
      },
      {
        closeOnEose: true,
      },
      NDKRelaySet.fromRelayUrls(relays, ndk),
    )
    .then((set) =>
      Array.from(set)
        .map((e) => e?.rawEvent())
        .filter(Boolean),
    );
}

export function useCashuWallets() {
  const ndk = useNDK();
  const pubkey = usePubkey();
  const relays = useRelays();
  return useQuery({
    enabled: Boolean(pubkey),
    queryKey: ["cashu-wallets", pubkey],
    queryFn: () => fetchCashuWallets(ndk, pubkey!, relays),
  });
}

export function useDefaultWallet() {
  return useAtom(defaultWalletAtom);
}

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
import { useNDK, useNWCNDK } from "@/lib/ndk";
import type { Zap } from "@/lib/nip-57";
import { usePubkey } from "@/lib/account";
import { cashuAtom } from "@/app/store";
import { useRelays, useRelaySet } from "@/lib/nostr";

export type ChachiWallet =
  | { type: "nip60" }
  | { type: "nwc"; connection: string }
  | { type: "webln" };

export const cashuWalletAtom = atom<NDKCashuWallet | null>(null);
export const walletsAtom = atomWithStorage<ChachiWallet[]>(
  "wallets",
  [],
  createJSONStorage<ChachiWallet[]>(() => localStorage),
  { getOnInit: true },
);

export const defaultMints = ["https://mint.0xchat.com"];

export function useCashuWallet() {
  return useAtomValue(cashuWalletAtom);
}

export function useChachiWallet() {
  const { t } = useTranslation();
  const ndk = useNDK();
  const nwcNdk = useNWCNDK();
  const pubkey = usePubkey();
  const relays = useRelays();
  const [wallets] = useWallets();
  const [, setNDKWallets] = useAtom(ndkWalletsAtom);
  const [cashuWallet, setCashuWallet] = useAtom(cashuWalletAtom);
  const cashu = useAtomValue(cashuAtom);

  useEffect(() => {
    Promise.allSettled(
      wallets.map(async (w) => {
        if (w.type === "nwc") {
          return createNWCWallet(w.connection, nwcNdk);
        } else if (w.type === "webln") {
          return createWebLNWallet();
        }
        throw new Error("Unsupported wallet type");
      }),
    ).then((results) => {
      const newWallets = results
        .map((r) => (r.status === "fulfilled" ? r.value : null))
        .filter((w) => w) as NDKWallet[];
      setNDKWallets((wallets) => [...wallets, ...newWallets]);
    });
  }, []);

  //  useEffect(() => {
  //    //if (pubkey && defaultWallet && defaultWallet.type === "nip60") {
  //    //  ndk
  //    //    .fetchEvent(
  //    //      {
  //    //        kinds: [NDKKind.CashuWallet],
  //    //        authors: [pubkey],
  //    //      },
  //    //      {
  //    //        closeOnEose: true,
  //    //      },
  //    //      relaySet,
  //    //    )
  //    //    .then((ev) => {
  //    //      if (!ev) {
  //    //        console.error("Wallet not found");
  //    //        return;
  //    //      }
  //    //      const event = new NDKEvent(ndk, ev);
  //    //      event
  //    //        .decrypt(new NDKUser({ pubkey }), ndk.signer, "nip44")
  //    //        .then(() => {
  //    //          NDKCashuWallet.from(event)
  //    //            .then((w) => {
  //    //              if (!w) return;
  //    //              ndk.wallet = w;
  //    //              setWallet(w);
  //    //    	  setNDKWallets((wallets) => [...wallets, w]);
  //    //              //fixme: this is trying to /mint/bolt11 already minted tokens?
  //    //              w.start();
  //    //              const name = w.walletId || event.dTag;
  //    //              w.on("ready", () =>
  //    //                toast.success(t("wallet.ready", { name })),
  //    //              );
  //    //            })
  //    //            .catch((err) => {
  //    //              console.error(err);
  //    //              toast.error(t("wallet.sync-error"));
  //    //            });
  //    //        });
  //    //    });
  //    //  return () => {
  //    //    if (wallet instanceof NDKCashuWallet) {
  //    //      wallet?.stop();
  //    //    }
  //    //  };
  //    //} else
  //   if (defaultWallet?.type === "nwc") {
  //	    const existing = ndkWallets.find(w => w instanceof NDKNWCWallet && w.pairingCode === defaultWallet.connection)
  //	    if (existing) {
  //		    ndk.wallet = existing;
  //		    setWallet(existing);
  //		    return;
  //	    }
  //      const u = new URL(defaultWallet.connection);
  //      const relayUrls = u.searchParams.getAll("relay");
  //      for (const relay of relayUrls) {
  //        nwcNdk.addExplicitRelay(relay);
  //      }
  //      const nwc = new NDKNWCWallet(nwcNdk, {
  //        timeout: 20_000,
  //        pairingCode: defaultWallet.connection,
  //      });
  //      nwc.on("ready", () => {
  //        setWallet(nwc);
  //        ndk.wallet = nwc;
  //		  setNDKWallets((wallets) => [...wallets, nwc]);
  //      });
  //    } else if (defaultWallet?.type === "webln") {
  //	    const existing = ndkWallets.find((w: NDKWallet) => w instanceof NDKWebLNWallet)
  //	    if (existing) {
  //		    ndk.wallet = existing;
  //		    setWallet(existing);
  //		    return;
  //	    }
  //      const w = new NDKWebLNWallet();
  //      setWallet(w);
  //      ndk.wallet = w;
  //setNDKWallets((wallets) => [...wallets, w]);
  //    }
  //  }, [defaultWallet]);

  useEffect(() => {
    if (cashu && pubkey && !cashuWallet) {
      createCashuWallet(cashu, ndk, relays)
        .then((w) => {
          if (!w) {
            toast.error(t("wallet.sync-error"));
            return;
          }
          setCashuWallet(w);
          setNDKWallets((wallets) => [w, ...wallets]);
        })
        .catch((err) => {
          console.error(err);
          toast.error(t("wallet.sync-error"));
        });
    }
  }, [cashu, cashuWallet, pubkey]);
}

export function useNDKWallet(): [
  NDKWallet | undefined,
  (wallet: NDKWallet) => NDKWallet,
] {
  const ndk = useNDK();
  return [
    ndk.wallet as NDKWallet | undefined,
    (wallet: NDKWallet) => {
      ndk.wallet = wallet;
      return wallet;
    },
  ];
}

export function useWallets() {
  return useAtom(walletsAtom);
}

const ndkWalletsAtom = atom<NDKWallet[]>([]);

export function useNDKWallets() {
  return useAtom(ndkWalletsAtom);
}

export type Direction = "in" | "out";

export type Unit = "sat" | "msat" | "eur" | "usd";

export interface Transaction {
  id: string;
  created_at: number;
  amount: number;
  fee?: number;
  unit: Unit;
  direction: Direction;
  description?: string;
  mint?: string;
  token?: string;
  invoice?: string;
  e?: string;
  p?: string;
  pubkey?: string;
  tags: string[][];
  zap: Zap | null;
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
      //...wallet.event!.filter(),
    },
    wallet.relaySet?.relayUrls || [],
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
          (t) =>
            t[0] === "e" &&
            !["created", "destroyed", "redeemed"].includes(t[3]) &&
            t[4] !== pubkey,
        )?.[1];
        const token = tags.find(
          (t) => t[0] === "e" && ["created", "destroyed"].includes(t[3]),
        )?.[1];
        const p = tags.find((t) => t[0] === "p")?.[1];
        if (direction && amount && mint && unit) {
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
            tags: event.tags,
            zap: null,
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

export function useDeposit() {
  const { t } = useTranslation();
  return useCallback(
    async (
      wallet: NDKWallet,
      amount: number,
      mint: string,
      onSuccess: () => void,
      onError?: () => void,
    ) => {
      if (!wallet) throw new Error("No wallet");
      if (wallet instanceof NDKCashuWallet) {
        const deposit = wallet.deposit(amount, mint);
        deposit.on("success", onSuccess);
        if (onError) {
          deposit.on("error", onError);
        }
        return deposit.start();
      } else if (wallet instanceof NDKNWCWallet) {
        const res = await wallet.makeInvoice(amount, t("wallet.deposit"));
        // @ts-expect-error: wrongly typed
        return res.invoice;
      } else {
        throw new Error("Deposit not supported for this wallet type");
      }
    },
    [],
  );
}

export function useCreateWallet() {
  const ndk = useNDK();
  const [, setWallets] = useAtom(walletsAtom);
  return async (mints: string[], relays: string[]) => {
    const wallet = new NDKCashuWallet(ndk);
    wallet.mints = mints ? mints : defaultMints;
    wallet.relaySet = NDKRelaySet.fromRelayUrls(relays, ndk);
    const p2pk = await wallet.getP2pk();
    await wallet.publish();
    if (p2pk) {
      const ev = new NDKEvent(ndk, {
        kind: NDKKind.CashuMintList,
        tags: [
          ...relays.map((r) => ["relay", r]),
          ...mints.map((m) => ["mint", m]),
          ["pubkey", p2pk],
        ],
      } as NostrEvent);
      await ev.publish();
    }
    if (wallet.event) {
      setWallets((wallets) => [...wallets, { type: "nip60" }]);
    }
  };
}

async function fetchCashuWallet(
  ndk: NDK,
  pubkey: string,
  relays: string[],
): Promise<NostrEvent | null> {
  return ndk
    .fetchEvent(
      {
        kinds: [NDKKind.CashuWallet],
        authors: [pubkey],
      },
      {
        closeOnEose: true,
      },
      NDKRelaySet.fromRelayUrls(relays, ndk),
    )
    .then(async (ev) => {
      if (ev) {
        await ev.decrypt(new NDKUser({ pubkey }));
        return ev.rawEvent() as NostrEvent;
      }
      throw new Error("Wallet not found");
    });
}

export function useNutsack() {
  const ndk = useNDK();
  const pubkey = usePubkey();
  const relays = useRelays();
  return useQuery({
    enabled: Boolean(pubkey) && relays?.length > 0,
    queryKey: ["nutsack", pubkey],
    queryFn: () => fetchCashuWallet(ndk, pubkey!, relays),
  });
}

export function useNWCBalance(wallet: NDKNWCWallet) {
  return useQuery({
    queryKey: ["nwc-balance", wallet.walletId],
    queryFn: async () => {
      try {
        const res = await wallet.req("get_balance", {});
        if (res?.result) {
          return res.result.balance ? res.result.balance / 1000 : 0;
        }
        return 0;
      } catch (err) {
        console.error(err);
      }
    },
    staleTime: Infinity,
  });
}

export function useNWCInfo(wallet: NDKNWCWallet) {
  return useQuery({
    queryKey: ["nwc-info", wallet.walletId],
    queryFn: async () => {
      return wallet.getInfo();
    },
    staleTime: Infinity,
  });
}

interface NWCWalletTransaction {
  amount: number;
  description?: string;
  fees_paid?: number;
  created_at: number;
  expires_at: number;
  invoice: string;
  preimage: string;
  metadata?: Record<string, string>;
  type: "incoming" | "outgoing";
}

async function fetchNWCTransactions(
  wallet: NDKNWCWallet,
): Promise<NWCWalletTransaction[]> {
  try {
    const res = await wallet.req("list_transactions", {});
    if (res?.result) {
      return res.result.transactions as NWCWalletTransaction[];
    }
    throw new Error("Could not load wallet transactions");
  } catch (err) {
    console.error(err);
    throw err;
  }
}

export function useNWCTransactions(wallet: NDKNWCWallet) {
  return useQuery({
    queryKey: ["nwc-txs", wallet.walletId],
    queryFn: () => fetchNWCTransactions(wallet),
    staleTime: Infinity,
  });
}

export function useCashu() {
  return useAtomValue(cashuAtom);
}

function equalNWCStrings(a: string, b: string) {
  const urlA = new URL(a);
  const urlB = new URL(b);
  return (
    urlA.host === urlB.host &&
    urlA.searchParams.get("secret") === urlB.searchParams.get("secret")
  );
}

export function useNWCWallet(connection?: string) {
  const [ndkWallets] = useNDKWallets();
  return ndkWallets.find(
    (w) =>
      w instanceof NDKNWCWallet &&
      connection &&
      w.pairingCode &&
      equalNWCStrings(w.pairingCode, connection),
  ) as NDKNWCWallet | undefined;
}

export async function createCashuWallet(
  event: NostrEvent,
  ndk: NDK,
  relays: string[],
): Promise<NDKCashuWallet> {
  return new Promise(async (resolve, reject) => {
    const ev = new NDKEvent(ndk, event);
    const w = await NDKCashuWallet.from(ev);
    if (!w) {
      reject("Failed to create wallet");
      return;
    }
    w.relaySet = NDKRelaySet.fromRelayUrls(relays, ndk);
    w.start();
    w.on("ready", () => {
      resolve(w);
    });
  });
}

export async function createWebLNWallet() {
  return new NDKWebLNWallet();
}

export async function createNWCWallet(connection: string, ndk: NDK) {
  return new Promise<NDKNWCWallet>((resolve) => {
    const nwc = new NDKNWCWallet(ndk, {
      timeout: 20_000,
      pairingCode: connection,
    });
    nwc.on("ready", () => {
      resolve(nwc);
    });
  });
}

import { useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  queryClient,
  WALLET_INFO,
  WALLET_BALANCE,
  WALLET_TXS,
} from "@/lib/query";
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
import { Zap, validateZapRequest } from "@/lib/nip-57";
import { usePubkey } from "@/lib/account";
import { cashuAtom } from "@/app/store";
import { useRelays } from "@/lib/nostr";

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
  a?: string;
  p?: string;
  pubkey?: string;
  tags: string[][];
  zap: Zap | null;
}

function useStreamMap(
  filter: NDKFilter | NDKFilter[],
  relaySet: NDKRelaySet,
  transform: (ev: NostrEvent) => Promise<Transaction | null>,
) {
  const ndk = useNDK();
  const [events, setEvents] = useState<Transaction[]>([]);

  useEffect(() => {
    const sub = ndk.subscribe(
      filter,
      {
        cacheUsage: NDKSubscriptionCacheUsage.ONLY_RELAY,
        closeOnEose: false,
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
  const myRelays = useRelays();
  return useStreamMap(
    {
      kinds: [NDKKind.WalletChange],
      authors: [pubkey],
      //...wallet.event!.filter(),
    },
    wallet.relaySet || NDKRelaySet.fromRelayUrls(myRelays, ndk),
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
        const a = tags.find((t) => t[0] === "a")?.[1];
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
            a,
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

export interface DepositOptions {
  amount: number;
  description?: string;
  mint?: string; // cashu wallets
}

export function useDeposit(wallet: NDKWallet) {
  const { t } = useTranslation();
  return useCallback(
    async (
      options: DepositOptions,
      onSuccess: () => void,
      onError?: (err?: Error | string) => void,
    ) => {
      if (!wallet) throw new Error("No wallet");
      if (wallet instanceof NDKCashuWallet) {
        const deposit = wallet.deposit(options.amount, options.mint);
        deposit.on("success", onSuccess);
        if (onError) {
          deposit.on("error", onError);
        }
        return deposit.start();
      } else if (wallet instanceof NDKNWCWallet) {
        // todo: detect deposit
        try {
          const res = await wallet.makeInvoice(
            options.amount,
            options.description || t("wallet.deposit"),
          );
          // @ts-expect-error: wrongly typed
          return res.invoice;
        } catch (err) {
          if (err instanceof Error) {
            onError?.(err);
          }
        }
      } else if (wallet instanceof NDKWebLNWallet) {
        try {
          const res = await wallet.provider
            ?.makeInvoice({
              amount: options.amount,
              defaultMemo: options.description || t("wallet.deposit"),
            })
            .catch(onError);
          return res?.paymentRequest;
        } catch (err) {
          if (err instanceof Error) {
            onError?.(err);
          }
        }
      }
    },
    [wallet],
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

export function useNWCBalance(wallet: NDKNWCWallet) {
  return useQuery({
    queryKey: [WALLET_BALANCE, wallet.walletId],
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

export function useCashuBalance(wallet: NDKCashuWallet) {
  const proofs = wallet.state.getProofEntries({ onlyAvailable: true });
  return proofs.reduce((acc, b) => acc + b.proof.amount, 0);
}

export function useNWCInfo(wallet: NDKNWCWallet) {
  return useQuery({
    queryKey: [WALLET_INFO, wallet.walletId],
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

function tryParseZap(raw: string, invoice: string): Zap | null {
  try {
    return validateZapRequest(raw, invoice);
  } catch (err) {
    return null;
  }
}

async function fetchNWCTransactions(
  wallet: NDKNWCWallet,
): Promise<Transaction[]> {
  try {
    const res = await wallet.req("list_transactions", {});
    if (!res?.result?.transactions) {
      throw new Error("Could not load wallet transactions");
    }
    const txs = res.result.transactions as NWCWalletTransaction[];
    const sorted = txs.map((nwcTx) => {
      return {
        id: nwcTx.preimage || nwcTx.invoice,
        created_at: nwcTx.created_at,
        amount: nwcTx.amount / 1000,
        fee: nwcTx.fees_paid ? nwcTx.fees_paid / 1000 : 0,
        unit: "sat" as Unit,
        invoice: nwcTx.invoice,
        direction: nwcTx.type === "incoming" ? "in" : ("out" as Direction),
        description: nwcTx.description,
        tags: [],
        zap: nwcTx.description?.startsWith("{")
          ? tryParseZap(nwcTx.description, nwcTx.invoice)
          : null,
      };
    });
    sorted.sort((a, b) => b.created_at - a.created_at);
    return sorted;
  } catch (err) {
    console.error(err);
    throw err;
  }
}

export function useNWCTransactions(wallet: NDKNWCWallet) {
  return useQuery({
    queryKey: [WALLET_TXS, wallet.walletId],
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
    resolve(w);
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

export function refreshWallet(wallet: NDKWallet) {
  queryClient.invalidateQueries({
    queryKey: [WALLET_BALANCE, wallet.walletId],
  });
  queryClient.invalidateQueries({ queryKey: [WALLET_TXS, wallet.walletId] });
}

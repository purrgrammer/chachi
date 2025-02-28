import { useCallback, useEffect, useState } from "react";
import { decode } from "light-bolt11-decoder";
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
  NDKWalletChange,
  NDKCashuWallet,
  NDKWebLNWallet,
  NDKNWCWallet,
} from "@nostr-dev-kit/ndk-wallet";
import { useNDK, useNWCNDK } from "@/lib/ndk";
import { Zap, validateZapRequest } from "@/lib/nip-57";
import { usePubkey, useMintList } from "@/lib/account";
import { cashuAtom } from "@/app/store";
import { useRelays } from "@/lib/nostr";
import { fetchMintInfo, fetchMintKeys } from "@/lib/cashu";
import { useNutzapMonitor } from "@/lib/nutzaps";

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
  const mintList = useMintList();
  const [wallets] = useWallets();
  const [, setNDKWallets] = useAtom(ndkWalletsAtom);
  const [cashuWallet, setCashuWallet] = useAtom(cashuWalletAtom);
  const cashu = useAtomValue(cashuAtom);

  useNutzapMonitor();

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

  useEffect(() => {
    if (cashu && pubkey && !cashuWallet) {
      createCashuWallet(cashu, ndk, mintList ? mintList.relays : relays)
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
        groupable: false,
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
            tags,
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
    const ev = new NDKEvent(ndk, {
      kind: NDKKind.CashuMintList,
      tags: [
        ...relays.map((r) => ["relay", r]),
        ...mints.map((m) => ["mint", m]),
        ["pubkey", p2pk],
      ],
    } as NostrEvent);
    await ev.publish();
    await wallet.publish();
    if (wallet.event) {
      setWallets((wallets) => [...wallets, { type: "nip60" }]);
    }
  };
}

export function useNWCBalance(wallet: NDKNWCWallet) {
  return useQuery({
    queryKey: [WALLET_BALANCE, walletId(wallet)],
    queryFn: async () => {
      try {
        const res = await wallet.req("get_balance", {});
        if (res?.result) {
          return res.result.balance ? Math.floor(res.result.balance / 1000) : 0;
        }
        return 0;
      } catch (err) {
        console.error(err);
      }
    },
  });
}

export function useWebLNBalance(wallet: NDKWebLNWallet) {
  return useQuery({
    enabled: Boolean(wallet.provider),
    queryKey: [WALLET_BALANCE, walletId(wallet)],
    queryFn: async () => {
      try {
        const provider = wallet.provider;
        if (provider) {
          const res = await provider?.getBalance?.();
          return res?.balance ?? 0;
        }
        return 0;
      } catch (err) {
        console.error(err);
      }
    },
  });
}

export function useCashuBalance(wallet: NDKCashuWallet) {
  return wallet.state.getBalance();
}

export function useNWCInfo(wallet: NDKNWCWallet) {
  return useQuery({
    queryKey: [WALLET_INFO, walletId(wallet)],
    queryFn: async () => {
      return wallet.getInfo();
    },
    staleTime: Infinity,
  });
}

export function useWebLNInfo(wallet: NDKWebLNWallet) {
  return useQuery({
    enabled: Boolean(wallet.provider),
    queryKey: [WALLET_INFO, walletId(wallet)],
    queryFn: async () => {
      return wallet.provider?.getInfo();
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
    // todo: keep txs in memory and sync from timestamp
    const res = await wallet.req("list_transactions", {
      limit: 50,
      unpaid: false,
    });
    if (!res?.result?.transactions) {
      throw new Error("Could not load wallet transactions");
    }
    const txs = res.result.transactions as NWCWalletTransaction[];
    const sorted = txs.map((nwcTx) => {
      const decoded = nwcTx.invoice ? decode(nwcTx.invoice) : null;
      return {
        id: nwcTx.preimage || nwcTx.invoice,
        created_at: nwcTx.created_at,
        amount: Math.floor(nwcTx.amount / 1000),
        fee: nwcTx.fees_paid ? Math.floor(nwcTx.fees_paid / 1000) : 0,
        unit: "sat" as Unit,
        invoice: nwcTx.invoice,
        direction: nwcTx.type === "incoming" ? "in" : ("out" as Direction),
        description:
          nwcTx.description ||
          decoded?.sections?.find((s) => s.name === "description")?.value,
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
    queryKey: [WALLET_TXS, walletId(wallet)],
    queryFn: () => fetchNWCTransactions(wallet),
    staleTime: Infinity,
  });
}

//todo
//export function useWebLNTransactions(wallet: NDKWebLNWallet) {
//  return useQuery({
//    enabled: Boolean(wallet.provider),
//    queryKey: [WALLET_TXS, walletId(wallet)],
//    queryFn: () => wallet.provider?.getTransactions(),
//    staleTime: Infinity,
//  });
//}

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

export function useWebLNWallet() {
  const [ndkWallets] = useNDKWallets();
  return ndkWallets.find((w) => w.type === "webln") as
    | NDKWebLNWallet
    | undefined;
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
    w.onMintInfoNeeded = async (mint: string) => {
      const info = await fetchMintInfo(mint);
      return info;
    };
    w.onMintKeysNeeded = async (mint: string) => {
      const keys = await fetchMintKeys(mint);
      return keys;
    };
    w.start();
    resolve(w);
    w.on("ready", () => {
      resolve(w);
      w.checkProofs();
    });
  });
}

export async function createWebLNWallet() {
  return new NDKWebLNWallet();
}

export async function createNWCWallet(connection: string, ndk: NDK) {
  return new Promise<NDKNWCWallet>((resolve) => {
    const nwc = new NDKNWCWallet(ndk, {
      timeout: 5_000,
      pairingCode: connection,
    });
    nwc.on("ready", () => {
      resolve(nwc);
    });
  });
}

export function refreshWallet(wallet: NDKWallet) {
  queryClient.invalidateQueries({
    queryKey: [WALLET_BALANCE, walletId(wallet)],
  });
  queryClient.invalidateQueries({ queryKey: [WALLET_TXS, walletId(wallet)] });
}

export async function createCashuOutTxEvent(
  wallet: NDKCashuWallet,
  paymentRequest: { amount: number; description?: string },
  paymentResult: {
    fee?: number;
    mint: string;
    stateUpdate?: any;
    result: { proofs: any[]; mint: string };
    proofsChange: any;
  },
): Promise<NDKWalletChange> {
  const { amount, description } = paymentRequest;
  const { fee, mint, stateUpdate } = paymentResult;

  const historyEvent = new NDKWalletChange(wallet.ndk);
  if (wallet.event) historyEvent.tags.push(wallet.event.tagReference());
  historyEvent.direction = "out";
  historyEvent.amount = amount ?? 0;
  historyEvent.mint = mint;
  if (description) historyEvent.description = description;

  if (fee) historyEvent.fee = fee;
  if (stateUpdate?.created)
    historyEvent.createdTokens = [paymentResult.stateUpdate.created];
  if (stateUpdate?.deleted)
    historyEvent.destroyedTokenIds = paymentResult.stateUpdate.deleted;
  if (stateUpdate?.reserved)
    historyEvent.reservedTokens = [paymentResult.stateUpdate.reserved];

  await historyEvent.sign();
  await historyEvent.publish(wallet.relaySet);

  return historyEvent;
}

export async function mintEcash(w: NDKCashuWallet, totalAmount: number) {
  let result;
  const amounts = [totalAmount];
  for (const mint of w.mints) {
    const wallet = await w.cashuWallet(mint);
    const mintProofs = await w.state.getProofs({ mint });
    result = await wallet.send(totalAmount, mintProofs, {
      proofsWeHave: mintProofs,
      includeFees: true,
      outputAmounts: {
        sendAmounts: amounts,
      },
    });

    if (result.send.length > 0) {
      const change = {
        store: result?.keep ?? [],
        destroy: result.send,
        mint,
      };
      const updateRes = await w.state.update(change);
      // create a change event
      createCashuOutTxEvent(
        w,
        {
          description: "Send ecash",
          amount: amounts.reduce((acc, amount) => acc + amount, 0),
        },
        {
          result: { proofs: result.send, mint },
          proofsChange: change,
          stateUpdate: updateRes,
          mint,
          fee: 0,
        },
      );
      return {
        mint,
        proofs: result.send,
      };
    }
  }
}

export function walletId(w: NDKWallet): string {
  if (w.type === "nwc" && w instanceof NDKNWCWallet) {
    return `nwc:${w.pairingCode}`;
  }
  return w.walletId;
}

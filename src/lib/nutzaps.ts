import { useLiveQuery } from "dexie-react-hooks";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useEffect } from "react";
import { atom, useAtom } from "jotai";
import db from "@/lib/db";
import { NostrEvent } from "nostr-tools";
import { useNDK } from "@/lib/ndk";
import { useCashuWallet } from "@/lib/wallet";
import { NDKCashuMintList, NDKUser, NDKNutzap } from "@nostr-dev-kit/ndk";
import { NDKNutzapMonitor } from "@nostr-dev-kit/wallet";
import { formatShortNumber } from "@/lib/number";
import { usePubkey } from "@/lib/account";

export function getKnownNutzaps() {
  return db.nutzaps
    .where("status")
    .anyOf(["redeemed", "spent", "failed"])
    .toArray();
}

export function getNutzaps() {
  return db.nutzaps.toArray();
}

export function useNutzapStatus(id: string) {
  return useLiveQuery(() => db.nutzaps.get(id).then((n) => n?.status));
}

export function saveNutzap(
  ev: NostrEvent,
  status?: "redeemed" | "spent" | "failed",
  txId?: string,
  claimedAt?: number,
) {
  db.transaction("rw", db.nutzaps, async () => {
    const nutzap = await db.nutzaps.get(ev.id);
    if (nutzap) {
      await db.nutzaps.put({ ...nutzap, status, txId, claimedAt });
    } else {
      await db.nutzaps.add({ ...ev, status, txId, claimedAt });
    }
  });
}

//async function getKnownNutzaps(ndk: NDK) {
//	try {
//	return db.nutzaps.toArray();
//	} catch (err) {
//		console.error(err);
//	}
//}

const nutzapMonitorAtom = atom<NDKNutzapMonitor | null>(null);

export function useNutzapMonitor() {
  const { t } = useTranslation();
  const ndk = useNDK();
  const pubkey = usePubkey();
  const [nutzapMonitor, setNutzapMonitor] = useAtom(nutzapMonitorAtom);
  const cashuWallet = useCashuWallet();
  const knownNutzaps = useLiveQuery(() =>
    getKnownNutzaps().then(
      (zs) => new Set(zs.map((z) => z.id).filter(Boolean)),
    ),
  );

  useEffect(() => {
    if (!cashuWallet) return;
    if (!pubkey) return;
    if (!knownNutzaps) return;
    if (nutzapMonitor) return;

    // todo: fetch and pass mint list
    const mintList = new NDKCashuMintList(ndk);
    const monitor = new NDKNutzapMonitor(ndk, new NDKUser({ pubkey }), {
      mintList,
    });
    monitor.wallet = cashuWallet;

    setNutzapMonitor(monitor);

    monitor.on("seen", (event) => {
      saveNutzap(event.rawEvent() as NostrEvent);
    });

    monitor.on("redeemed", (events: NDKNutzap[], amount: number) => {
      for (const event of events) {
        saveNutzap(
          event.rawEvent() as NostrEvent,
          "redeemed",
          event.id,
          Math.floor(Date.now() / 1000),
        );
      }
      toast.success(
        t("nutzaps.redeem-success", {
          amount: formatShortNumber(amount),
        }),
      );
    });

    monitor.on("failed", (event) => {
      saveNutzap(event.rawEvent() as NostrEvent, "failed");
    });

    monitor.start({
      opts: {
        groupable: false,
      },
    });
  }, [cashuWallet, pubkey, nutzapMonitor, knownNutzaps]);
}

import { useLiveQuery } from "dexie-react-hooks";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useEffect } from "react";
import { atom, useAtom } from "jotai";
import db from "@/lib/db";
import { NostrEvent } from "nostr-tools";
import { useNDK } from "@/lib/ndk";
import { useCashuWallet } from "@/lib/wallet";
import { NDKUser } from "@nostr-dev-kit/ndk";
import { NDKNutzapMonitor } from "@nostr-dev-kit/ndk-wallet";
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

const MONITOR_PAGE_SIZE = 20;

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

    const monitor = new NDKNutzapMonitor(
      ndk,
      new NDKUser({ pubkey }),
      cashuWallet.relaySet,
    );
    monitor.wallet = cashuWallet;

    setNutzapMonitor(monitor);

    monitor.on("seen", (event) => {
      //console.log("NUTZAP.SEEN", event.rawEvent());
      saveNutzap(event.rawEvent() as NostrEvent);
    });

    monitor.on("redeem", (event) => {
      //console.log("NUTZAP.REDEEM", event.rawEvent());
      saveNutzap(
        event.rawEvent() as NostrEvent,
        "redeemed",
        event.id,
        Math.floor(Date.now() / 1000),
      );
      toast.success(
        t("nutzaps.redeem-success", {
          amount: formatShortNumber(event.amount),
        }),
      );
    });

    monitor.on("spent", (event) => {
      //console.log("NUTZAP.SPENT", event.rawEvent());
      saveNutzap(event.rawEvent() as NostrEvent, "spent");
    });

    monitor.on("failed", (event) => {
      //console.log("NUTZAP.FAILED", event.rawEvent());
      saveNutzap(event.rawEvent() as NostrEvent, "failed");
    });

    console.log("NUTZAP MONITOR START", knownNutzaps);
    monitor.start({
      knownNutzaps,
      pageSize: MONITOR_PAGE_SIZE,
    });
  }, [cashuWallet, pubkey, nutzapMonitor, knownNutzaps]);
}

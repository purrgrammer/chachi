import Dexie, { Table } from "dexie";
import NDKCacheAdapterDexie from "@nostr-dev-kit/ndk-cache-dexie";
import { NDKEvent } from "@nostr-dev-kit/ndk";
//import { Transaction } from "@/lib/wallet";

// todo: tweak cache sizes
export const cache = new NDKCacheAdapterDexie({
  dbName: "ndk",
});

interface Event {
  id: string;
  group: string;
  kind: number;
  created_at: number;
  content: string;
  pubkey: string;
  tags: string[][];
}

export interface LastSeen {
  group: string;
  kind: number;
  tag: string;
  ref: string;
  created_at: number;
}

//interface TX extends Transaction {
//
//}

export type NutzapStatus = "redeemed" | "spent" | "failed";

export interface Nutzap {
  id: string;
  group?: string;
  kind: number;
  created_at: number;
  content: string;
  pubkey: string;
  tags: string[][];
  sig: string;
  status?: NutzapStatus;
  txId?: string;
  claimedAt?: number;
}

class ChachiDatabase extends Dexie {
  events!: Table<Event>;
  lastSeen!: Table<LastSeen>;
  //transactions!: Table<Transaction>;
  nutzaps!: Table<Nutzap>;

  constructor(name: string) {
    super(name);
    this.version(2).stores({
      events: "&id,created_at,group,[group+kind]",
      lastSeen: "[group+kind]",
      nutzaps: "&id,status,txId",
    });
  }
}
const db = new ChachiDatabase("chachi");

export default db;

// Function to check if an event is unpublished
export async function isEventUnpublished(eventId: string): Promise<boolean> {
  try {
    const unpublished = await getUnpublishedEvent(eventId);
    if (unpublished) {
      return unpublished.publishStatus !== "success";
    }
    return false;
  } catch (error) {
    console.error("Error checking unpublished events:", error);
    return false;
  }
}

export async function getUnpublishedEvent(
  eventId: string,
): Promise<NDKEvent | null> {
  const unpublishedEvents = await cache.getUnpublishedEvents();
  return unpublishedEvents.find((e) => e.event.id === eventId)?.event ?? null;
}

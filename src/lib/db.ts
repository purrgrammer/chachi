import Dexie, { Table } from "dexie";
import NDKCacheAdapterDexie from "@nostr-dev-kit/ndk-cache-dexie";
import { NDKCashuToken, NDKEvent } from "@nostr-dev-kit/ndk";
import { Group, GroupMetadata } from "./types";
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

interface TokenEvent {
  id: string;
  kind: number;
  created_at: number;
  content: string;
  pubkey: string;
  tags: string[][];
  sig: string;
}

export interface LastSeen {
  group: string;
  kind: number;
  tag: string;
  ref: string;
  created_at: number;
}

export interface GroupInfo {
  id: string;
  relay: string;
  name: string;
  about?: string;
  pubkey?: string;
  picture?: string;
  nlink?: string;
  visibility?: "public" | "private";
  access?: "open" | "closed";
}

export interface GroupParticipants {
  id: string;
  relay: string;
  members: string[];
  admins: string[];
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
  tokenEvents!: Table<TokenEvent>;
  groupInfo!: Table<GroupInfo>;
  //transactions!: Table<Transaction>;
  nutzaps!: Table<Nutzap>;

  constructor(name: string) {
    super(name);
    this.version(5).stores({
      events: "&id,created_at,group,[group+kind]",
      lastSeen: "[group+kind]",
      nutzaps: "&id,status,txId",
      tokenEvents: "&id,created_at",
      groupInfo: "[id+relay]",
    });
  }
}
const db = new ChachiDatabase("chachi");

export default db;

export function getUnpublishedEvents() {
  return cache
    .getUnpublishedEvents()
    .then((events) => events.map((e) => e.event));
}

export function getTokenEvents() {
  // todo: sort by created_at
  return db.tokenEvents.toArray();
}

export function saveTokenEvent(token: NDKCashuToken) {
  db.tokenEvents.put(token.rawEvent() as TokenEvent);
}

export function saveGroupInfo(group: Group, metadata: GroupMetadata) {
  db.groupInfo.put({
    id: group.id,
    relay: group.relay,
    name: metadata.name,
    about: metadata.about,
    pubkey: metadata.pubkey,
    picture: metadata.picture,
    nlink: metadata.nlink,
    visibility: metadata.visibility,
    access: metadata.access,
  });
}

export function getGroupInfo(group: Group) {
  return db.groupInfo
    .where("[id+relay]")
    .equals([group.id, group.relay])
    .first();
}

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

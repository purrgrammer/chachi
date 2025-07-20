import Dexie, { Table } from "dexie";
import NDKCacheAdapterDexie from "@nostr-dev-kit/ndk-cache-dexie";
import { NDKCashuToken, NDKEvent } from "@nostr-dev-kit/ndk";
import { Event, Group, GroupMetadata, Community, EmojiSet } from "./types";
import { groupId } from "./groups";
//import { Transaction } from "@/lib/wallet";

// TODO: tweak cache sizes
export const cache = new NDKCacheAdapterDexie({
  dbName: "ndk",
});

export interface TokenEvent {
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
  isCommunity?: boolean;
}

export interface GroupParticipants {
  group: string;
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

export interface PrivateEvent {
  id: string;
  gift: string;
  group: string;
  kind: number;
  created_at: number;
  content: string;
  pubkey: string;
  tags: string[][];
}

class ChachiDatabase extends Dexie {
  events!: Table<Event>;
  lastSeen!: Table<LastSeen>;
  tokenEvents!: Table<TokenEvent>;
  groupInfo!: Table<GroupInfo>;
  groupParticipants!: Table<GroupParticipants>;
  //transactions!: Table<Transaction>;
  nutzaps!: Table<Nutzap>;
  community!: Table<Community>;
  dms!: Table<PrivateEvent>;
  emojiSets!: Table<EmojiSet>;

  constructor(name: string) {
    super(name);
    this.version(14).stores({
      events:
        "&id,created_at,group,[group+kind],[group+kind+created_at],[group+created_at]",
      lastSeen: "[group+kind],created_at,[group+created_at]",
      nutzaps: "&id,status,txId",
      tokenEvents: "&id,created_at,[pubkey+created_at]",
      groupInfo: "[id+relay]",
      groupParticipants: "&group",
      community: "&pubkey",
      dms: "&id,gift,created_at,group,pubkey,[group+kind],[group+kind+created_at],[group+created_at],[group+pubkey]",
      emojiSets: "&address",
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

export function getTokenEvents(pubkey: string) {
  return db.tokenEvents
    .where("[pubkey+created_at]")
    .between([pubkey, Dexie.minKey], [pubkey, Dexie.maxKey])
    .toArray();
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
    isCommunity: metadata.isCommunity,
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

export function getCommunity(pubkey: string) {
  return db.community.get(pubkey);
}

export function saveCommunity(community: Community) {
  db.community.put(community);
}

export function saveGroupParticipants(
  group: Group,
  members: string[],
  admins: string[],
) {
  const id = groupId(group);
  db.groupParticipants.put({
    group: id,
    members,
    admins,
  });
}

export function getGroupParticipants(group: Group) {
  const id = groupId(group);
  if (group.isCommunity) {
    return {
      group: id,
      admins: [group.id],
      members: [],
    };
  }
  if (group.id === "_") {
    return {
      group: id,
      admins: [],
      members: [],
    };
  }
  return db.groupParticipants.get(id);
}

export function getEmojiSet(address: string) {
  return db.emojiSets.get(address);
}

export function saveEmojiSet(emojiSet: EmojiSet) {
  return db.emojiSets.put(emojiSet);
}

import Dexie, { Table } from "dexie";
import NDKCacheAdapterDexie from "@nostr-dev-kit/cache-dexie";
import { NDKEvent } from "@nostr-dev-kit/ndk";
import { Event, Group, GroupMetadata, Community, EmojiSet } from "./types";
import { groupId } from "./groups";

// TODO: tweak cache sizes
export const cache = new NDKCacheAdapterDexie({
  dbName: "ndk",
});

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
  /** private: only members can read group messages */
  isPrivate?: boolean;
  /** restricted: only members can write messages to the group */
  isRestricted?: boolean;
  /** hidden: relay hides group metadata from non-members */
  isHidden?: boolean;
  /** closed: join requests are ignored (invite-only) */
  isClosed?: boolean;
  isCommunity?: boolean;
}

export interface GroupParticipants {
  group: string;
  members: string[];
  admins: string[];
}

export interface LastSeenSyncMeta {
  key: string; // singleton key, always "sync"
  lastProcessedTimestamp: number; // last remote event timestamp we processed
  lastPublishedTimestamp: number; // last event timestamp we published
}

class ChachiDatabase extends Dexie {
  events!: Table<Event>;
  lastSeen!: Table<LastSeen>;
  groupInfo!: Table<GroupInfo>;
  groupParticipants!: Table<GroupParticipants>;
  community!: Table<Community>;
  emojiSets!: Table<EmojiSet>;
  lastSeenSyncMeta!: Table<LastSeenSyncMeta>;

  constructor(name: string) {
    super(name);
    this.version(15).stores({
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
      lastSeenSyncMeta: "&key",
    });
    this.version(16).stores({
      dmGroups: "&id,lastMessageAt,*senderPubkeys",
    });
    // Version 17: Remove wallet/payment/DM tables (keep lastSeenSyncMeta for group chat)
    this.version(17).stores({
      events:
        "&id,created_at,group,[group+kind],[group+kind+created_at],[group+created_at]",
      lastSeen: "[group+kind],created_at,[group+created_at]",
      groupInfo: "[id+relay]",
      groupParticipants: "&group",
      community: "&pubkey",
      emojiSets: "&address",
      lastSeenSyncMeta: "&key",
      // Removed tables: nutzaps, tokenEvents, dms, dmGroups
      nutzaps: null,
      tokenEvents: null,
      dms: null,
      dmGroups: null,
    });
  }
}
const db = new ChachiDatabase("chachi");

export default db;

export function getUnpublishedEvents() {
  return cache
    .getUnpublishedEvents()
    .then((events: { event: NDKEvent }[]) => events.map((e) => e.event));
}

export async function saveGroupInfo(
  group: Group,
  metadata: GroupMetadata,
): Promise<void> {
  try {
    await db.groupInfo.put({
      id: group.id,
      relay: group.relay,
      name: metadata.name,
      about: metadata.about,
      pubkey: metadata.pubkey,
      picture: metadata.picture,
      nlink: metadata.nlink,
      isPrivate: metadata.isPrivate,
      isRestricted: metadata.isRestricted,
      isHidden: metadata.isHidden,
      isClosed: metadata.isClosed,
      isCommunity: metadata.isCommunity,
    });
  } catch (error) {
    console.error("Error saving group info to database:", error, {
      group,
      metadata,
    });
    // Re-throw to let callers handle the error if needed
    throw error;
  }
}

export async function getGroupInfo(
  group: Group,
): Promise<GroupInfo | undefined> {
  try {
    return await db.groupInfo
      .where("[id+relay]")
      .equals([group.id, group.relay])
      .first();
  } catch (error) {
    console.error("Error reading group info from database:", error, { group });
    return undefined;
  }
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
  return (
    unpublishedEvents.find((e: { event: NDKEvent }) => e.event.id === eventId)
      ?.event ?? null
  );
}

export function getCommunity(pubkey: string) {
  return db.community.get(pubkey);
}

export async function saveCommunity(community: Community): Promise<void> {
  try {
    await db.community.put(community);
  } catch (error) {
    console.error("Error saving community to database:", error, { community });
    throw error;
  }
}

export async function saveGroupParticipants(
  group: Group,
  members: string[],
  admins: string[],
): Promise<void> {
  try {
    const id = groupId(group);
    await db.groupParticipants.put({
      group: id,
      members,
      admins,
    });
  } catch (error) {
    console.error("Error saving group participants to database:", error, {
      group,
      memberCount: members.length,
      adminCount: admins.length,
    });
    throw error;
  }
}

export async function getGroupParticipants(
  group: Group,
): Promise<GroupParticipants | undefined> {
  try {
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
    return await db.groupParticipants.get(id);
  } catch (error) {
    console.error("Error reading group participants from database:", error, {
      group,
    });
    return undefined;
  }
}

export function getEmojiSet(address: string) {
  return db.emojiSets.get(address);
}

export function saveEmojiSet(emojiSet: EmojiSet) {
  return db.emojiSets.put(emojiSet);
}

export async function getLastSeenSyncMeta(): Promise<LastSeenSyncMeta> {
  const meta = await db.lastSeenSyncMeta.get("sync");
  return (
    meta || {
      key: "sync",
      lastProcessedTimestamp: 0,
      lastPublishedTimestamp: 0,
    }
  );
}

export async function updateLastSeenSyncMeta(
  updates: Partial<Omit<LastSeenSyncMeta, "key">>,
) {
  const current = await getLastSeenSyncMeta();
  await db.lastSeenSyncMeta.put({
    ...current,
    ...updates,
  });
}

/**
 * Prunes old lastSeen entries to prevent unbounded database growth
 * Keeps entries from the last N days (default 365 days)
 * @param retentionDays - Number of days to retain (default: 365)
 * @returns Number of entries deleted
 */
export async function pruneOldLastSeenEntries(
  retentionDays: number = 365,
): Promise<number> {
  const cutoffTimestamp = Math.floor(Date.now() / 1000) - retentionDays * 86400;

  const deleteCount = await db.lastSeen
    .where("created_at")
    .below(cutoffTimestamp)
    .delete();

  if (deleteCount > 0) {
    console.log(
      `[DB] Pruned ${deleteCount} lastSeen entries older than ${retentionDays} days`,
    );
  }

  return deleteCount;
}

export async function logLastSeenData() {
  const records = await db.lastSeen.toArray();

  console.group("📊 LastSeen Tracking Data");
  console.log(`Total records: ${records.length}`);
  console.log("");

  records.forEach((record, index) => {
    const date = new Date(record.created_at * 1000).toISOString();
    console.log(`[${index + 1}] group: ${record.group}`);
    console.log(`    kind: ${record.kind}`);
    console.log(`    created_at: ${record.created_at} (${date})`);
    console.log(`    tag: ${record.tag || "(empty)"}`);
    console.log(`    ref: ${record.ref || "(empty)"}`);
    console.log("");
  });

  // Group by kind to see patterns
  const byKind = records.reduce(
    (acc, record) => {
      acc[record.kind] = (acc[record.kind] || 0) + 1;
      return acc;
    },
    {} as Record<number, number>,
  );

  console.log("📈 Summary by Kind:");
  Object.entries(byKind).forEach(([kind, count]) => {
    console.log(`  Kind ${kind}: ${count} records`);
  });

  console.groupEnd();

  return records;
}

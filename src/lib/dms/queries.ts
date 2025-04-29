import { NDKKind } from "@nostr-dev-kit/ndk";
import { PrivateGroup as Group } from "@/lib/types";
import db from "@/lib/db";
import Dexie from "dexie";

function groupId(g: Group) {
  return g.id;
}

export async function getGroupChat(group: Group) {
  const id = groupId(group);
  return db.dms
    .where("[group+created_at]")
    .between([id, Dexie.minKey], [id, Dexie.maxKey])
    .reverse()
    .limit(100)
    .toArray();
}

export async function getGroupChatParticipants(
  group: Group,
): Promise<string[]> {
  const id = groupId(group);
  const events = await db.dms
    .where("[group+kind]")
    .anyOf([
      [id, NDKKind.PrivateDirectMessage],
      [id, NDKKind.Nutzap],
    ])
    .toArray();
  const pubkeys = events.map((ev) => ev.pubkey).filter(Boolean) as string[];
  return Array.from(new Set(pubkeys)) as string[];
}

export async function getLastGroupMessage(group: Group) {
  const id = groupId(group);
  return db.dms
    .where("[group+created_at]")
    .between([id, Dexie.minKey], [id, Dexie.maxKey])
    .filter((e) => e.kind !== NDKKind.Reaction)
    .last();
}

export async function getGroupMessagesAfter(group: Group, timestamp = 0) {
  const id = groupId(group);
  return db.dms
    .where("[group+created_at]")
    .between([id, timestamp + 1], [id, Dexie.maxKey])
    .count();
}

export async function getGroupReactions(group: Group) {
  const id = groupId(group);
  const reactions = await db.dms
    .where("[group+kind]")
    .equals([id, NDKKind.Reaction])
    .limit(100)
    .toArray();
  return reactions.filter((r) => r.pubkey);
}

export async function getGroupsSortedByLastMessage(groups: Group[]) {
  const lastMessages = (
    await Promise.all(groups.map(getLastGroupMessage))
  ).filter(Boolean);
  const sorted = [...groups].sort((a, b) => {
    const aLast =
      lastMessages.find((m) => m!.group === groupId(a))?.created_at ?? 0;
    const bLast =
      lastMessages.find((m) => m!.group === groupId(b))?.created_at ?? 0;
    return bLast - aLast;
  });
  return sorted;
}

export async function getLastSeen(group: Group) {
  const id = groupId(group);
  return db.lastSeen
    .where("[group+created_at]")
    .between([id, Dexie.minKey], [id, Dexie.maxKey])
    .last();
}

export async function getGroupMentionsAfter(
  group: Group,
  pubkey: string,
  timestamp = 0,
) {
  const id = groupId(group);
  return db.dms
    .where("[group+kind+created_at]")
    .between(
      [id, NDKKind.PrivateDirectMessage, timestamp + 1],
      [id, NDKKind.PrivateDirectMessage, Dexie.maxKey],
    )
    .and((ev) => ev.tags.some((t) => t[0] === "p" && t[1] === pubkey))
    .count();
}

export async function getUnreadMessages(group: Group) {
  const lastSeen = await getLastSeen(group);
  return getGroupMessagesAfter(group, lastSeen?.created_at || 0);
}

export async function getUnreadMessagesCount(group: Group) {
  const lastSeen = await getLastSeen(group);
  return getGroupMessagesAfter(group, lastSeen?.created_at || 0);
}

export async function getTotalUnreadMessages(groups: Group[]) {
  const countsPromises = groups.map(getUnreadMessagesCount);
  const counts = await Promise.all(countsPromises);
  return counts.reduce((sum, count) => sum + count, 0);
}

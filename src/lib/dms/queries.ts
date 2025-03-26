import { NDKKind } from "@nostr-dev-kit/ndk";
import { PrivateGroup as Group } from "@/lib/types";
import db from "@/lib/db";

function groupId(g: Group) {
  return g.id;
}

export async function getGroupChat(group: Group) {
  const id = groupId(group);
  const events = await db.dms
    .where("[group+kind]")
    .anyOf([
      [id, NDKKind.PrivateDirectMessage],
      [id, NDKKind.Nutzap],
    ])
    .reverse()
    .sortBy("created_at");
  // todo: pagination
  return events.slice(0, 100);
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
  const msgs = await db.dms
    .where("[group+kind]")
    .anyOf([
      [id, NDKKind.PrivateDirectMessage],
      [id, NDKKind.Nutzap],
    ])
    .sortBy("created_at");
  return msgs?.at(-1);
}

export async function getGroupMessagesAfter(group: Group, timestamp = 0) {
  const id = groupId(group);
  return db.dms
    .where("[group+kind]")
    .equals([id, NDKKind.PrivateDirectMessage])
    .and((ev) => ev.created_at > timestamp)
    .count();
}

export async function getGroupReactions(group: Group) {
  const id = groupId(group);
  const reactions = await db.dms
    .where("[group+kind]")
    .equals([id, NDKKind.Reaction])
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
  const results = await db.lastSeen
    .where("[group+kind]")
    .anyOf([
      [groupId(group), NDKKind.PrivateDirectMessage],
      [groupId(group), NDKKind.Nutzap],
    ])
    .sortBy("created_at");
  return results.at(-1);
}

export async function getGroupMentionsAfter(
  group: Group,
  pubkey: string,
  timestamp = 0,
) {
  const id = groupId(group);
  return db.dms
    .where("[group+kind]")
    .equals([id, NDKKind.PrivateDirectMessage])
    .and(
      (ev) =>
        ev.created_at > timestamp &&
        ev.tags.some((t) => t[0] === "p" && t[1] === pubkey),
    )
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

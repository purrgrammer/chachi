import { NostrEvent } from "nostr-tools";
import { NDKKind } from "@nostr-dev-kit/ndk";
import { groupId } from "@/lib/groups";
import { Group } from "@/lib/types";
import db from "@/lib/db";

// todo: can i use first() or last() instead of materializing array

export function saveGroupEvent(event: NostrEvent, group: Group) {
  const record = {
    id: event.id,
    kind: event.kind,
    created_at: event.created_at,
    content: event.content,
    tags: event.tags,
    pubkey: event.pubkey,
    group: groupId(group),
  };
  db.events.put(record);
}

export async function getGroupChat(group: Group) {
  const id = groupId(group);
  const events = await db.events
    .where("[group+kind]")
    .anyOf([
      [id, NDKKind.GroupChat],
      [id, NDKKind.GroupAdminAddUser],
      [id, NDKKind.GroupAdminRemoveUser],
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
  const events = await db.events
    .where("[group+kind]")
    .anyOf([
      [id, NDKKind.GroupChat],
      [id, NDKKind.GroupAdminAddUser],
    ])
    .toArray();
  const pubkeys = events
    .map((ev) =>
      ev.kind === NDKKind.GroupAdminAddUser
        ? ev.tags.find((t) => t[0] === "p")?.[1]
        : ev.pubkey,
    )
    .filter(Boolean) as string[];
  return Array.from(new Set(pubkeys)) as string[];
}

export async function getLastGroupMessage(group: Group) {
  const id = groupId(group);
  const msgs = await db.events
    .where("[group+kind]")
    .equals([id, NDKKind.GroupChat])
    .sortBy("created_at");
  return msgs?.at(-1);
}

export async function getGroupMessagesAfter(group: Group, timestamp = 0) {
  const id = groupId(group);
  return db.events
    .where("[group+kind]")
    .equals([id, NDKKind.GroupChat])
    .and((ev) => ev.created_at > timestamp)
    .count();
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

export function getLastSeen(group: Group, kind = NDKKind.GroupChat) {
  return db.lastSeen
    .where("[group+kind]")
    .equals([groupId(group), kind])
    .first();
}

export async function getUnreadMessages(group: Group) {
  const lastSeen = await getLastSeen(group);
  return getGroupMessagesAfter(group, lastSeen?.created_at || 0);
}

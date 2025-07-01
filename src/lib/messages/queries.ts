import { NostrEvent } from "nostr-tools";
import { NDKKind } from "@nostr-dev-kit/ndk";
import { groupId } from "@/lib/groups";
import { Group } from "@/lib/types";
import db from "@/lib/db";
import Dexie from "dexie";

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

export async function getGroupEvents(group: Group) {
  const id = groupId(group);
  return db.events
    .where("[group+created_at]")
    .between([id, Dexie.minKey], [id, Dexie.maxKey])
    .reverse()
    .limit(50)
    .toArray();
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
  return db.events
    .where("[group+created_at]")
    .between([id, Dexie.minKey], [id, Dexie.maxKey])
    .last();
}

export async function getLastUserMessage(group: Group, userPubkey: string) {
  const id = groupId(group);
  return db.events
    .where("[group+created_at]")
    .between([id, Dexie.minKey], [id, Dexie.maxKey])
    .filter((ev) => ev.pubkey === userPubkey)
    .last();
}

export async function getGroupMessagesAfter(
  group: Group,
  timestamp = 0,
  excludePubkey?: string,
) {
  const id = groupId(group);
  let query = db.events
    .where("[group+created_at]")
    .between([id, timestamp + 1], [id, Dexie.maxKey]);

  if (excludePubkey) {
    query = query.and((ev) => ev.pubkey !== excludePubkey);
  }

  return query.count();
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
  return db.events
    .where("[group+kind+created_at]")
    .between(
      [id, NDKKind.GroupChat, timestamp + 1],
      [id, NDKKind.GroupChat, Dexie.maxKey],
    )
    .and((ev) => ev.tags.some((t) => t[0] === "p" && t[1] === pubkey))
    .count();
}

export async function getUnreadMentions(group: Group, pubkey: string) {
  const lastSeen = await getLastSeen(group);
  let baseline = lastSeen?.created_at || 0;
  const lastUserMessage = await getLastUserMessage(group, pubkey);
  if (lastUserMessage) {
    baseline = Math.max(baseline, lastUserMessage.created_at);
  }
  return getGroupMentionsAfter(group, pubkey, baseline);
}

export async function getUnreadMessages(
  group: Group,
  currentUserPubkey?: string,
) {
  const lastSeen = await getLastSeen(group);
  let baseline = lastSeen?.created_at || 0;

  // If we have a current user, use the later of last seen or last user message
  if (currentUserPubkey) {
    const lastUserMessage = await getLastUserMessage(group, currentUserPubkey);
    if (lastUserMessage) {
      baseline = Math.max(baseline, lastUserMessage.created_at);
    }
  }

  return getGroupMessagesAfter(group, baseline, currentUserPubkey);
}

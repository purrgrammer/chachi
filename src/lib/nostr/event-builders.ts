/**
 * Event builder utilities
 *
 * This module provides pure functions for creating Nostr event templates.
 * These functions return EventTemplate objects (unsigned events) that can be
 * signed and published using the publishing hooks.
 *
 * All builders follow NIP specifications for proper event structure.
 */

import type { NostrEvent } from "nostr-tools";
import * as Kind from "./kinds";

/**
 * Event template type - an unsigned event ready for signing
 */
export type EventTemplate = Pick<
  NostrEvent,
  "kind" | "tags" | "content" | "created_at"
>;

/**
 * Helper to create basic event template structure
 */
function createEventTemplate(
  kind: number,
  content: string,
  tags: string[][] = [],
): EventTemplate {
  return {
    kind,
    content,
    tags,
    created_at: Math.floor(Date.now() / 1000),
  };
}

/**
 * Helper to create event reference tags (e/a tags)
 * This mimics NDKEvent's .tag() behavior
 */
export function createEventReferenceTags(event: NostrEvent): string[][] {
  const tags: string[][] = [];

  // For addressable events (kind >= 30000 && kind < 40000), use 'a' tag
  if (event.kind >= 30000 && event.kind < 40000) {
    const dTag = event.tags.find((t) => t[0] === "d")?.[1] || "";
    tags.push(["a", `${event.kind}:${event.pubkey}:${dTag}`]);
  } else {
    // For regular events, use 'e' tag
    tags.push(["e", event.id]);
  }

  // Always add 'p' tag for the author
  tags.push(["p", event.pubkey]);

  return tags;
}

/**
 * Helper to add group tags (NIP-29)
 */
function addGroupTags(tags: string[][], groupId: string, relay?: string): void {
  if (relay) {
    tags.push(["h", groupId, relay]);
  } else {
    tags.push(["h", groupId]);
  }
}

// ============================================================================
// TEXT AND BASIC EVENTS
// ============================================================================

/**
 * Build a text note event (kind 1)
 */
export function buildTextEvent(
  content: string,
  tags: string[][] = [],
): EventTemplate {
  return createEventTemplate(Kind.Text, content, tags);
}

/**
 * Build a thread/microblog post (kind 11)
 */
export function buildThreadEvent(
  content: string,
  tags: string[][] = [],
): EventTemplate {
  return createEventTemplate(Kind.Thread, content, tags);
}

/**
 * Build a generic reply event (kind 1111)
 */
export function buildGenericReplyEvent(
  content: string,
  replyTo: NostrEvent,
  tags: string[][] = [],
): EventTemplate {
  const allTags = [
    ...createEventReferenceTags(replyTo),
    ...tags,
  ];
  return createEventTemplate(Kind.GenericReply, content, allTags);
}

// ============================================================================
// REACTIONS
// ============================================================================

/**
 * Build a reaction event (kind 7)
 */
export function buildReactionEvent(
  content: string,
  target: NostrEvent,
  customEmojiTags: string[][] = [],
): EventTemplate {
  const tags = [
    ...createEventReferenceTags(target),
    ...customEmojiTags,
  ];
  return createEventTemplate(Kind.Reaction, content, tags);
}

/**
 * Build a custom emoji reaction event
 */
export function buildCustomEmojiReaction(
  emojiName: string,
  emojiSrc: string,
  target: NostrEvent,
  emojiAddress?: string,
): EventTemplate {
  const emojiTag = emojiAddress
    ? ["emoji", emojiName, emojiSrc, emojiAddress]
    : ["emoji", emojiName, emojiSrc];

  return buildReactionEvent(`:${emojiName}:`, target, [emojiTag]);
}

// ============================================================================
// EVENT DELETION
// ============================================================================

/**
 * Build an event deletion request (kind 5)
 */
export function buildDeletionEvent(
  eventIds: string[],
  reason: string = "",
): EventTemplate {
  const tags = eventIds.map((id) => ["e", id]);
  return createEventTemplate(Kind.EventDeletion, reason, tags);
}

// ============================================================================
// GROUP EVENTS (NIP-29)
// ============================================================================

/**
 * Build a group chat message (kind 9)
 */
export function buildGroupChatEvent(
  content: string,
  groupId: string,
  relay: string,
  additionalTags: string[][] = [],
): EventTemplate {
  const tags = [...additionalTags];
  addGroupTags(tags, groupId, relay);
  return createEventTemplate(Kind.GroupChat, content, tags);
}

/**
 * Build a group reply event (kind 12)
 */
export function buildGroupReplyEvent(
  content: string,
  groupId: string,
  relay: string,
  replyTo: NostrEvent,
  additionalTags: string[][] = [],
): EventTemplate {
  const tags = [
    ...createEventReferenceTags(replyTo),
    ...additionalTags,
  ];
  addGroupTags(tags, groupId, relay);
  return createEventTemplate(Kind.GroupReply, content, tags);
}

/**
 * Build a group admin create group event (kind 9007)
 */
export function buildGroupAdminCreateGroupEvent(
  groupId: string,
): EventTemplate {
  return createEventTemplate(Kind.GroupAdminCreateGroup, "", [
    ["h", groupId],
  ]);
}

/**
 * Build a group admin edit metadata event (kind 9002)
 */
export function buildGroupAdminEditMetadataEvent(
  groupId: string,
  metadata: {
    name?: string;
    about?: string;
    picture?: string;
    visibility?: "public" | "private";
    access?: "open" | "closed";
  },
): EventTemplate {
  const tags: string[][] = [["h", groupId]];

  if (metadata.name) tags.push(["name", metadata.name]);
  if (metadata.about) tags.push(["about", metadata.about]);
  if (metadata.picture) tags.push(["picture", metadata.picture]);

  if (metadata.visibility === "private") {
    tags.push(["private"]);
  } else if (metadata.visibility === "public") {
    tags.push(["public"]);
  }

  if (metadata.access === "closed") {
    tags.push(["closed"]);
  } else if (metadata.access === "open") {
    tags.push(["open"]);
  }

  return createEventTemplate(Kind.GroupAdminEditMetadata, "", tags);
}

/**
 * Build a group admin add user event (kind 9000)
 */
export function buildGroupAdminAddUserEvent(
  groupId: string,
  pubkeys: string[],
): EventTemplate {
  const tags: string[][] = [["h", groupId]];
  pubkeys.forEach((pubkey) => tags.push(["p", pubkey]));
  return createEventTemplate(Kind.GroupAdminAddUser, "", tags);
}

/**
 * Build a group admin remove user event (kind 9001)
 */
export function buildGroupAdminRemoveUserEvent(
  groupId: string,
  pubkeys: string[],
): EventTemplate {
  const tags: string[][] = [["h", groupId]];
  pubkeys.forEach((pubkey) => tags.push(["p", pubkey]));
  return createEventTemplate(Kind.GroupAdminRemoveUser, "", tags);
}

/**
 * Build a group admin request join event (kind 9021)
 */
export function buildGroupAdminRequestJoinEvent(
  groupId: string,
): EventTemplate {
  return createEventTemplate(Kind.GroupAdminRequestJoin, "", [
    ["h", groupId],
  ]);
}

// ============================================================================
// LIST EVENTS
// ============================================================================

/**
 * Build a simple group list event (kind 10009)
 */
export function buildSimpleGroupListEvent(
  groups: Array<{ id: string; relay: string }>,
): EventTemplate {
  const tags = groups.map((g) => ["group", g.id, g.relay]);
  return createEventTemplate(Kind.SimpleGroupList, "", tags);
}

/**
 * Build an emoji list event (kind 10030)
 */
export function buildEmojiListEvent(
  emojis: Array<{ name: string; url: string; address?: string }>,
): EventTemplate {
  const tags = emojis.map((e) =>
    e.address ? ["emoji", e.name, e.url, e.address] : ["emoji", e.name, e.url],
  );
  return createEventTemplate(Kind.EmojiList, "", tags);
}

/**
 * Build a relay list event (kind 10002)
 */
export function buildRelayListEvent(
  relays: Array<{ url: string; read?: boolean; write?: boolean }>,
): EventTemplate {
  const tags = relays.map((r) => {
    if (r.read && r.write) return ["r", r.url];
    if (r.read) return ["r", r.url, "read"];
    if (r.write) return ["r", r.url, "write"];
    return ["r", r.url];
  });
  return createEventTemplate(Kind.RelayList, "", tags);
}

/**
 * Build a blossom list event (kind 10063)
 */
export function buildBlossomListEvent(servers: string[]): EventTemplate {
  const tags = servers.map((url) => ["server", url]);
  return createEventTemplate(Kind.BlossomList, "", tags);
}

// ============================================================================
// MEDIA EVENTS
// ============================================================================

/**
 * Build an image event (kind 20)
 */
export function buildImageEvent(
  url: string,
  caption: string = "",
  tags: string[][] = [],
): EventTemplate {
  const allTags = [["url", url], ["alt", caption], ...tags];
  return createEventTemplate(Kind.Image, caption, allTags);
}

/**
 * Build a video event (kind 34235 or 34236)
 */
export function buildVideoEvent(
  url: string,
  isVertical: boolean,
  caption: string = "",
  tags: string[][] = [],
): EventTemplate {
  const kind = isVertical ? Kind.VerticalVideo : Kind.HorizontalVideo;
  const allTags = [["url", url], ["alt", caption], ...tags];
  return createEventTemplate(kind, caption, allTags);
}

// ============================================================================
// ZAP EVENTS
// ============================================================================

/**
 * Build a zap request event (kind 9734)
 */
export function buildZapRequestEvent(
  target: NostrEvent,
  amountMillisats: number,
  relays: string[],
  comment: string = "",
): EventTemplate {
  const tags = [
    ...createEventReferenceTags(target),
    ["amount", String(amountMillisats)],
    ["relays", ...relays],
  ];

  if (comment) {
    tags.push(["comment", comment]);
  }

  return createEventTemplate(Kind.ZapRequest, comment, tags);
}

// ============================================================================
// POLL EVENTS
// ============================================================================

/**
 * Build a poll response event
 */
export function buildPollResponseEvent(
  pollEvent: NostrEvent,
  selectedOptions: string[],
): EventTemplate {
  const tags = [
    ["e", pollEvent.id],
    ...selectedOptions.map((option) => ["response", option]),
  ];
  return createEventTemplate(Kind.GenericReply, "", tags);
}

// ============================================================================
// CALENDAR EVENTS
// ============================================================================

/**
 * Build a calendar event RSVP (kind 31925)
 */
export function buildCalendarRSVPEvent(
  calendarEvent: NostrEvent,
  status: "accepted" | "declined" | "tentative",
  comment: string = "",
): EventTemplate {
  const dTag = calendarEvent.tags.find((t) => t[0] === "d")?.[1] || "";
  const tags = [
    ["a", `${calendarEvent.kind}:${calendarEvent.pubkey}:${dTag}`],
    ["status", status],
  ];

  return createEventTemplate(Kind.CalendarEventRSVP, comment, tags);
}

// ============================================================================
// EMOJI SET EVENTS
// ============================================================================

/**
 * Build an emoji set event (kind 30030)
 */
export function buildEmojiSetEvent(
  identifier: string,
  emojis: Array<{ name: string; url: string }>,
  name?: string,
): EventTemplate {
  const tags: string[][] = [["d", identifier]];

  if (name) {
    tags.push(["name", name]);
  }

  emojis.forEach((emoji) => {
    tags.push(["emoji", emoji.name, emoji.url]);
  });

  return createEventTemplate(Kind.EmojiSet, "", tags);
}

/**
 * Specialized publishing hooks
 *
 * This module provides domain-specific hooks for publishing common event types.
 * Each hook combines event builders with the base publishing functionality.
 */

import { useCallback } from "react";
import type { NostrEvent } from "nostr-tools";
import { usePublishEvent } from "./use-publish";
import * as builders from "./event-builders";
import type { Group } from "@/lib/types";
import type { Emoji } from "@/components/emoji-picker";

// ============================================================================
// REACTIONS
// ============================================================================

/**
 * Hook for publishing reactions to events
 *
 * @example
 * ```ts
 * const publishReaction = usePublishReaction();
 * await publishReaction(event, "+", relays);
 * ```
 */
export function usePublishReaction() {
  const publish = usePublishEvent();

  return useCallback(
    async (
      target: NostrEvent,
      content: string,
      relays?: string[],
    ): Promise<NostrEvent> => {
      console.log("[usePublishReaction]", {
        targetId: target.id,
        content,
        relays,
      });
      const template = builders.buildReactionEvent(content, target);
      return publish(template, relays);
    },
    [publish],
  );
}

/**
 * Hook for publishing custom emoji reactions
 *
 * @example
 * ```ts
 * const publishEmojiReaction = usePublishEmojiReaction();
 * await publishEmojiReaction(event, emoji, relays);
 * ```
 */
export function usePublishEmojiReaction() {
  const publish = usePublishEvent();

  return useCallback(
    async (
      target: NostrEvent,
      emoji: Emoji,
      relays?: string[],
    ): Promise<NostrEvent> => {
      console.log("[usePublishEmojiReaction]", {
        targetId: target.id,
        emoji: emoji.name,
        hasCustomImage: !!emoji.src,
        relays,
      });
      let template;

      if (emoji.src) {
        // Custom emoji with image
        template = builders.buildCustomEmojiReaction(
          emoji.name,
          emoji.src,
          target,
          emoji.address,
        );
      } else {
        // Standard emoji or shortcode
        const content = emoji.native || emoji.shortcodes || emoji.name;
        template = builders.buildReactionEvent(content, target);
      }

      return publish(template, relays);
    },
    [publish],
  );
}

// ============================================================================
// DELETION
// ============================================================================

/**
 * Hook for publishing event deletion requests
 *
 * @example
 * ```ts
 * const publishDeletion = usePublishDeletion();
 * await publishDeletion([eventId1, eventId2], "spam", relays);
 * ```
 */
export function usePublishDeletion() {
  const publish = usePublishEvent();

  return useCallback(
    async (
      eventIds: string[],
      reason?: string,
      relays?: string[],
    ): Promise<NostrEvent> => {
      console.log("[usePublishDeletion]", {
        eventIds,
        reason,
        relays,
      });
      const template = builders.buildDeletionEvent(eventIds, reason);
      return publish(template, relays);
    },
    [publish],
  );
}

// ============================================================================
// GROUP MESSAGES
// ============================================================================

/**
 * Hook for publishing group chat messages (NIP-29)
 *
 * @example
 * ```ts
 * const publishGroupMessage = usePublishGroupMessage();
 * await publishGroupMessage("Hello group!", group, additionalTags);
 * ```
 */
export function usePublishGroupMessage() {
  const publish = usePublishEvent();

  return useCallback(
    async (
      content: string,
      group: Group,
      additionalTags: string[][] = [],
    ): Promise<NostrEvent> => {
      console.log("[usePublishGroupMessage]", {
        groupId: group.id,
        relay: group.relay,
        isCommunity: group.isCommunity,
        contentLength: content.length,
        tagCount: additionalTags.length,
      });
      const template = builders.buildGroupChatEvent(
        content,
        group.id,
        group.relay,
        additionalTags,
      );
      return publish(template, [group.relay]);
    },
    [publish],
  );
}

/**
 * Hook for publishing group replies (NIP-29)
 *
 * @example
 * ```ts
 * const publishGroupReply = usePublishGroupReply();
 * await publishGroupReply("Reply text", group, replyToEvent, additionalTags);
 * ```
 */
export function usePublishGroupReply() {
  const publish = usePublishEvent();

  return useCallback(
    async (
      content: string,
      group: Group,
      replyTo: NostrEvent,
      additionalTags: string[][] = [],
    ): Promise<NostrEvent> => {
      console.log("[usePublishGroupReply]", {
        groupId: group.id,
        relay: group.relay,
        replyToId: replyTo.id,
        contentLength: content.length,
      });
      const template = builders.buildGroupReplyEvent(
        content,
        group.id,
        group.relay,
        replyTo,
        additionalTags,
      );
      return publish(template, [group.relay]);
    },
    [publish],
  );
}

// ============================================================================
// GROUP ADMIN OPERATIONS
// ============================================================================

/**
 * Hook for creating a new group (NIP-29)
 *
 * @example
 * ```ts
 * const createGroup = usePublishGroupCreate();
 * await createGroup("my-group-id", "wss://relay.example.com");
 * ```
 */
export function usePublishGroupCreate() {
  const publish = usePublishEvent();

  return useCallback(
    async (groupId: string, relay: string): Promise<NostrEvent> => {
      console.log("[usePublishGroupCreate]", {
        groupId,
        relay,
      });
      const template = builders.buildGroupAdminCreateGroupEvent(groupId);
      return publish(template, [relay]);
    },
    [publish],
  );
}

/**
 * Hook for editing group metadata (NIP-29)
 *
 * @example
 * ```ts
 * const editGroup = usePublishGroupEdit();
 * await editGroup(groupId, relay, {
 *   name: "My Group",
 *   about: "A cool group",
 *   visibility: "public",
 *   access: "open"
 * });
 * ```
 */
export function usePublishGroupEdit() {
  const publish = usePublishEvent();

  return useCallback(
    async (
      groupId: string,
      relay: string,
      metadata: {
        name?: string;
        about?: string;
        picture?: string;
        visibility?: "public" | "private";
        access?: "open" | "closed";
      },
    ): Promise<NostrEvent> => {
      console.log("[usePublishGroupEdit]", {
        groupId,
        relay,
        metadata,
      });
      const template = builders.buildGroupAdminEditMetadataEvent(
        groupId,
        metadata,
      );
      return publish(template, [relay]);
    },
    [publish],
  );
}

/**
 * Hook for adding users to a group (NIP-29)
 *
 * @example
 * ```ts
 * const addUsers = usePublishGroupAddUser();
 * await addUsers(group, [pubkey1, pubkey2]);
 * ```
 */
export function usePublishGroupAddUser() {
  const publish = usePublishEvent();

  return useCallback(
    async (group: Group, pubkeys: string[]): Promise<NostrEvent> => {
      console.log("[usePublishGroupAddUser]", {
        groupId: group.id,
        relay: group.relay,
        pubkeys,
      });
      const template = builders.buildGroupAdminAddUserEvent(
        group.id,
        pubkeys,
      );
      return publish(template, [group.relay]);
    },
    [publish],
  );
}

/**
 * Hook for removing users from a group (NIP-29)
 *
 * @example
 * ```ts
 * const removeUsers = usePublishGroupRemoveUser();
 * await removeUsers(group, [pubkey1, pubkey2]);
 * ```
 */
export function usePublishGroupRemoveUser() {
  const publish = usePublishEvent();

  return useCallback(
    async (group: Group, pubkeys: string[]): Promise<NostrEvent> => {
      console.log("[usePublishGroupRemoveUser]", {
        groupId: group.id,
        relay: group.relay,
        pubkeys,
      });
      const template = builders.buildGroupAdminRemoveUserEvent(
        group.id,
        pubkeys,
      );
      return publish(template, [group.relay]);
    },
    [publish],
  );
}

/**
 * Hook for requesting to join a group (NIP-29)
 *
 * @example
 * ```ts
 * const requestJoin = usePublishGroupRequestJoin();
 * await requestJoin(group);
 * ```
 */
export function usePublishGroupRequestJoin() {
  const publish = usePublishEvent();

  return useCallback(
    async (group: Group): Promise<NostrEvent> => {
      const template = builders.buildGroupAdminRequestJoinEvent(group.id);
      return publish(template, [group.relay]);
    },
    [publish],
  );
}

// ============================================================================
// TEXT EVENTS
// ============================================================================

/**
 * Hook for publishing text notes (kind 1)
 *
 * @example
 * ```ts
 * const publishText = usePublishTextNote();
 * await publishText("Hello, Nostr!", tags, relays);
 * ```
 */
export function usePublishTextNote() {
  const publish = usePublishEvent();

  return useCallback(
    async (
      content: string,
      tags: string[][] = [],
      relays?: string[],
    ): Promise<NostrEvent> => {
      console.log("[usePublishTextNote]", {
        contentLength: content.length,
        tagCount: tags.length,
        relays,
      });
      const template = builders.buildTextEvent(content, tags);
      return publish(template, relays);
    },
    [publish],
  );
}

/**
 * Hook for publishing thread posts (kind 11)
 *
 * @example
 * ```ts
 * const publishThread = usePublishThreadPost();
 * await publishThread("Thread content", tags, relays);
 * ```
 */
export function usePublishThreadPost() {
  const publish = usePublishEvent();

  return useCallback(
    async (
      content: string,
      tags: string[][] = [],
      relays?: string[],
    ): Promise<NostrEvent> => {
      const template = builders.buildThreadEvent(content, tags);
      return publish(template, relays);
    },
    [publish],
  );
}

/**
 * Hook for publishing generic replies (kind 1111)
 *
 * @example
 * ```ts
 * const publishReply = usePublishGenericReply();
 * await publishReply("Reply content", replyToEvent, tags, relays);
 * ```
 */
export function usePublishGenericReply() {
  const publish = usePublishEvent();

  return useCallback(
    async (
      content: string,
      replyTo: NostrEvent,
      tags: string[][] = [],
      relays?: string[],
    ): Promise<NostrEvent> => {
      const template = builders.buildGenericReplyEvent(content, replyTo, tags);
      return publish(template, relays);
    },
    [publish],
  );
}

// ============================================================================
// LIST EVENTS
// ============================================================================

/**
 * Hook for publishing simple group lists (kind 10009)
 *
 * @example
 * ```ts
 * const publishGroupList = usePublishSimpleGroupList();
 * await publishGroupList([{ id: "group1", relay: "wss://..." }]);
 * ```
 */
export function usePublishSimpleGroupList() {
  const publish = usePublishEvent();

  return useCallback(
    async (
      groups: Array<{ id: string; relay: string }>,
      relays?: string[],
    ): Promise<NostrEvent> => {
      console.log("[usePublishSimpleGroupList]", {
        groupCount: groups.length,
        relays,
      });
      const template = builders.buildSimpleGroupListEvent(groups);
      return publish(template, relays);
    },
    [publish],
  );
}

/**
 * Hook for publishing blossom server lists (kind 10063)
 *
 * @example
 * ```ts
 * const publishBlossomList = usePublishBlossomList();
 * await publishBlossomList(["https://blossom1.com", "https://blossom2.com"]);
 * ```
 */
export function usePublishBlossomList() {
  const publish = usePublishEvent();

  return useCallback(
    async (servers: string[], relays?: string[]): Promise<NostrEvent> => {
      console.log("[usePublishBlossomList]", {
        serverCount: servers.length,
        relays,
      });
      const template = builders.buildBlossomListEvent(servers);
      return publish(template, relays);
    },
    [publish],
  );
}

// ============================================================================
// MEDIA EVENTS
// ============================================================================

/**
 * Hook for publishing image events (kind 20)
 *
 * @example
 * ```ts
 * const publishImage = usePublishImage();
 * await publishImage("https://...", "Caption", tags, relays);
 * ```
 */
export function usePublishImage() {
  const publish = usePublishEvent();

  return useCallback(
    async (
      url: string,
      caption: string = "",
      tags: string[][] = [],
      relays?: string[],
    ): Promise<NostrEvent> => {
      const template = builders.buildImageEvent(url, caption, tags);
      return publish(template, relays);
    },
    [publish],
  );
}

/**
 * Hook for publishing video events (kind 34235/34236)
 *
 * @example
 * ```ts
 * const publishVideo = usePublishVideo();
 * await publishVideo("https://...", false, "Caption", tags, relays);
 * ```
 */
export function usePublishVideo() {
  const publish = usePublishEvent();

  return useCallback(
    async (
      url: string,
      isVertical: boolean,
      caption: string = "",
      tags: string[][] = [],
      relays?: string[],
    ): Promise<NostrEvent> => {
      const template = builders.buildVideoEvent(url, isVertical, caption, tags);
      return publish(template, relays);
    },
    [publish],
  );
}

// ============================================================================
// POLL EVENTS
// ============================================================================

/**
 * Hook for publishing poll responses
 *
 * @example
 * ```ts
 * const publishPollResponse = usePublishPollResponse();
 * await publishPollResponse(pollEvent, ["option1", "option2"], relays);
 * ```
 */
export function usePublishPollResponse() {
  const publish = usePublishEvent();

  return useCallback(
    async (
      pollEvent: NostrEvent,
      selectedOptions: string[],
      relays?: string[],
    ): Promise<NostrEvent> => {
      const template = builders.buildPollResponseEvent(
        pollEvent,
        selectedOptions,
      );
      return publish(template, relays);
    },
    [publish],
  );
}

// ============================================================================
// CALENDAR EVENTS
// ============================================================================

/**
 * Hook for publishing calendar event RSVPs (kind 31925)
 *
 * @example
 * ```ts
 * const publishRSVP = usePublishCalendarRSVP();
 * await publishRSVP(calendarEvent, "accepted", "I'll be there!", relays);
 * ```
 */
export function usePublishCalendarRSVP() {
  const publish = usePublishEvent();

  return useCallback(
    async (
      calendarEvent: NostrEvent,
      status: "accepted" | "declined" | "tentative",
      comment: string = "",
      relays?: string[],
    ): Promise<NostrEvent> => {
      console.log("[usePublishCalendarRSVP]", {
        calendarEventId: calendarEvent.id,
        status,
        hasComment: comment.length > 0,
        relays,
      });
      const template = builders.buildCalendarRSVPEvent(
        calendarEvent,
        status,
        comment,
      );
      return publish(template, relays);
    },
    [publish],
  );
}

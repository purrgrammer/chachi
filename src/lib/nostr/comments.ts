import { validateZap } from "@/lib/nip-57-stub";
import { NostrEvent } from "nostr-tools";
import { validateZap } from "@/lib/nip-57-stub";
import { NDKEvent, NDKKind } from "@nostr-dev-kit/ndk";
import { useNDK } from "@/lib/ndk";
import { useStream } from "@/lib/nostr";
import type { Group } from "@/lib/types";

export function useReplies(event: NostrEvent, group?: Group, live = true) {
  const ndk = useNDK();
  const ev = new NDKEvent(ndk, event);
  const isFromGroup = event.tags.find(
    (t) => t[0] === "h" && t[1] === group?.id,
  );

  const filters = [
    event.kind === NDKKind.Text
      ? {
          kinds: [NDKKind.Text],
          ...(isFromGroup && group ? { "#h": [group.id] } : {}),
          "#e": [event.id],
          limit: 200,
        }
      : {
          kinds: [NDKKind.GenericReply],
          ...(isFromGroup && group ? { "#h": [group.id] } : {}),
          ...ev.filter(),
          "#k": [String(ev.kind)],
          limit: 200,
        },
    {
      kinds: [NDKKind.Zap],
      ...(isFromGroup && group ? { "#h": [group.id] } : {}),
      ...ev.filter(),
      limit: 100,
    },
  ];

  const replies = useStream(
    filters,
    isFromGroup && group ? [group.relay] : [],
    live,
    true,
  );

  const sortedEvents = [...replies.events];
  sortedEvents.sort((a, b) => a.created_at - b.created_at);

  return {
    ...replies,
    events: sortedEvents,
  };
}

export function useDirectReplies(
  event: NostrEvent,
  group?: Group,
  live = true,
) {
  const ndk = useNDK();
  const isFromGroup = event.tags.find(
    (t) => t[0] === "h" && t[1] === group?.id,
  );
  const ev = new NDKEvent(ndk, event);
  const [t, v] = ev.tagReference();
  const filters = [
    event.kind === NDKKind.Text
      ? {
          kinds: [NDKKind.Text],
          ...(isFromGroup && group ? { "#h": [group.id] } : {}),
          "#e": [event.id],
          limit: 100,
        }
      : {
          kinds: [NDKKind.GenericReply],
          ...(isFromGroup && group ? { "#h": [group.id] } : {}),
          [`#${t.toUpperCase()}`]: [v],
          "#k": [String(ev.kind)],
          limit: 100,
        },
    {
      kinds: [NDKKind.Zap],
      ...(isFromGroup && group ? { "#h": [group.id] } : {}),
      ...ev.filter(),
      limit: 100,
    },
  ];

  const replies = useStream(
    filters,
    isFromGroup && group ? [group.relay] : [],
    live,
    true,
  );

  // Filter for direct replies only using NIP-10 marker rules
  const directReplies = replies.events.filter((reply) => {
    // Skip if this is not a text kind (zaps and other types handled differently)
    if (reply.kind !== NDKKind.Text) return true;

    // Find all e tags to check for proper reply structure
    const eTags = reply.tags.filter((tag) => tag[0] === "e");

    // If there are no e tags, it's not a reply
    if (eTags.length === 0) return false;

    // Per NIP-10: The last e tag without a marker is the reply root
    // The e tag with marker "reply" is the direct reply target
    // Or if no marker exists, the last e tag is the direct reply target

    // Check if there's an explicit reply marker pointing to our event
    const hasDirectReplyMarker = eTags.some(
      (tag) => tag[1] === event.id && (tag[3] === "reply" || tag.length === 2),
    );

    // If there's a direct marker, or this is the only e-tag (implicit direct reply)
    return (
      hasDirectReplyMarker || (eTags.length === 1 && eTags[0][1] === event.id)
    );
  });

  // Sort the replies using the sortComments function
  return {
    ...replies,
    events: sortComments(directReplies, event.pubkey),
  };
}

/**
 * Sorts comments according to the following rules:
 * - chronologically
 * - prioritize zaps and nutzaps that have content
 * - zaps sorted by amount
 * - zaps without comments at the bottom, sorted by amount
 */
export function sortComments(
  events: NostrEvent[],
  authorPubkey: string,
): NostrEvent[] {
  return [...events].sort((a, b) => {
    // First, check if either event is a direct reply from the author
    const aIsAuthorReply = a.pubkey === authorPubkey;
    const bIsAuthorReply = b.pubkey === authorPubkey;

    // If one is an author reply and the other isn't, prioritize the author reply
    if (aIsAuthorReply && !bIsAuthorReply) return -1;
    if (!aIsAuthorReply && bIsAuthorReply) return 1;

    // If both are author replies or both aren't, proceed with the existing sorting logic
    // Check if events are zaps
    const aZapInfo = a.kind === NDKKind.Zap ? validateZap(a) : null;
    const bZapInfo = b.kind === NDKKind.Zap ? validateZap(b) : null;

    const aIsZap = Boolean(aZapInfo);
    const bIsZap = Boolean(bZapInfo);

    const aHasContent = aIsZap
      ? Boolean(aZapInfo?.content.trim())
      : a.content.trim().length > 0;
    const bHasContent = bIsZap
      ? Boolean(bZapInfo?.content.trim())
      : b.content.trim().length > 0;

    // Get zap amounts
    const aAmount = aZapInfo?.amount || 0;
    const bAmount = bZapInfo?.amount || 0;

    // Case 1: One is a zap without content and the other is not
    if (aIsZap && !aHasContent && (!bIsZap || bHasContent)) {
      return 1; // Zap without content goes to the bottom
    }
    if (bIsZap && !bHasContent && (!aIsZap || aHasContent)) {
      return -1; // Zap without content goes to the bottom
    }

    // Case 2: Both are zaps without content - sort by amount (higher first)
    if (aIsZap && !aHasContent && bIsZap && !bHasContent) {
      return bAmount - aAmount;
    }

    // Case 3: Both are zaps with content - sort by amount (higher first)
    if (aIsZap && aHasContent && bIsZap && bHasContent) {
      if (aAmount !== bAmount) {
        return bAmount - aAmount;
      }
      // If same amount, fall through to chronological sort
    }

    // Case 4: One is a zap with content and the other is a regular post
    if (aIsZap && aHasContent && !bIsZap) {
      return -1; // Zap with content goes to the top
    }
    if (bIsZap && bHasContent && !aIsZap) {
      return 1; // Zap with content goes to the top
    }

    // Default: chronological sort for all other cases
    return a.created_at - b.created_at;
  });
}

import { NostrEvent } from "nostr-tools";
import { NDKEvent, NDKKind } from "@nostr-dev-kit/ndk";
import { useNDK } from "@/lib/ndk";
import { useStream } from "@/lib/nostr";
import type { Group } from "@/lib/types";
import { validateZap } from "@/lib/nip-57";
import { validateNutzap } from "@/lib/nip-61";

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
          ...ev.filter(),
        }
      : {
          kinds: [NDKKind.GenericReply],
          ...(isFromGroup && group ? { "#h": [group.id] } : {}),
          ...ev.filter(),
          "#k": [String(ev.kind)],
        },
    {
      kinds: [NDKKind.Zap, NDKKind.Nutzap],
      ...(isFromGroup && group ? { "#h": [group.id] } : {}),
      ...ev.filter(),
    },
  ];
  const replies = useStream(
    filters,
    isFromGroup && group ? [group.relay] : [],
    live,
    true,
  );
  const sortedReplies = [...replies.events];
  if (event.kind === NDKKind.Text) {
    sortedReplies.sort((a, b) => a.created_at - b.created_at);
  }

  return {
    ...replies,
    events: sortedReplies,
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
          ...ev.filter(),
        }
      : {
          kinds: [NDKKind.GenericReply],
          ...(isFromGroup && group ? { "#h": [group.id] } : {}),
          [`#${t.toUpperCase()}`]: [v],
          "#k": [String(ev.kind)],
        },
    {
      kinds: [NDKKind.Zap, NDKKind.Nutzap],
      ...(isFromGroup && group ? { "#h": [group.id] } : {}),
      ...ev.filter(),
    },
  ];
  const replies = useStream(
    filters,
    isFromGroup && group ? [group.relay] : [],
    live,
    true,
  );

  // Sort the replies using the sortComments function
  return {
    ...replies,
    events: sortComments(replies.events, event.pubkey),
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
    // Check if events are zaps or nutzaps
    const aZapInfo =
      a.kind === NDKKind.Zap
        ? validateZap(a)
        : a.kind === NDKKind.Nutzap
          ? validateNutzap(a)
          : null;
    const bZapInfo =
      b.kind === NDKKind.Zap
        ? validateZap(b)
        : b.kind === NDKKind.Nutzap
          ? validateNutzap(b)
          : null;

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

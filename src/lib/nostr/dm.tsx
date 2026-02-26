import { useLiveQuery } from "dexie-react-hooks";
import { NDKEvent } from "@nostr-dev-kit/ndk";
import db, { DMGroupSummary } from "@/lib/db";
import { NostrEvent } from "nostr-tools";
import NDK, {
  NDKRelaySet,
  NDKKind,
  NDKSubscriptionCacheUsage,
} from "@nostr-dev-kit/ndk";
import { discoveryRelays } from "@/lib/relay";
import { PrivateGroup } from "@/lib/types";
import { triggerLastSeenSync } from "@/lib/lastSeenSyncTrigger";

export interface UserRelayList {
  pubkey: string;
  dm: string[];           // NIP-17 kind 10050 relays
  outbox: string[];       // NIP-65 kind 10002 relays
  fallback: string[];     // Discovery/user relay fallback
  source: 'nip17' | 'nip65' | 'discovery' | 'user-relays';
  timestamp: number;
  error?: string;
}

export function groupId(event: NostrEvent) {
  const p = event.tags
    .filter((tag) => tag[0] === "p" && tag[1])
    .map((t) => t[1]);
  return Array.from(new Set([event.pubkey, ...p]))
    .sort()
    .join("");
}

export function useEvent(id: string) {
  return useLiveQuery(() => db.dms.get({ id }), [id]);
}

function splitIntoChunks(arr: string, chunkSize: number): string[] {
  const res: string[] = [];
  for (let i = 0; i < arr.length; i += chunkSize) {
    res.push(arr.slice(i, i + chunkSize));
  }
  return res;
}

export function idToGroup(id: string, pubkey: string) {
  const pubkeys = splitIntoChunks(id, 64);
  return {
    id,
    pubkeys: pubkeys.includes(pubkey) ? pubkeys : [...pubkeys, pubkey],
  };
}

export async function savePrivateEvent(event: NostrEvent, gift: NostrEvent) {
  const gid = groupId(event);
  const record = {
    id: event.id,
    kind: event.kind,
    created_at: event.created_at,
    content: event.content,
    tags: event.tags,
    pubkey: event.pubkey,
    group: gid,
    gift: gift.id,
  };
  await db.dms.put(record);
  await updateDMGroupSummary(gid, event);
}

async function updateDMGroupSummary(gid: string, event: NostrEvent) {
  const isReaction = event.kind === NDKKind.Reaction;
  const existing = await db.dmGroups.get(gid);

  if (existing) {
    const updates: Partial<DMGroupSummary> = {};
    // Track new sender
    if (!existing.senderPubkeys.includes(event.pubkey)) {
      updates.senderPubkeys = [...existing.senderPubkeys, event.pubkey];
    }
    // Update last message if this is newer and not a reaction
    if (!isReaction && event.created_at > existing.lastMessageAt) {
      updates.lastMessageAt = event.created_at;
      updates.lastMessageContent = event.content;
      updates.lastMessagePubkey = event.pubkey;
      updates.lastMessageTags = event.tags;
    }
    if (Object.keys(updates).length > 0) {
      await db.dmGroups.update(gid, updates);
    }
  } else {
    const pubkeys = splitIntoChunks(gid, 64);
    await db.dmGroups.put({
      id: gid,
      pubkeys,
      lastMessageAt: isReaction ? 0 : event.created_at,
      lastMessageContent: isReaction ? "" : event.content,
      lastMessagePubkey: isReaction ? "" : event.pubkey,
      lastMessageTags: isReaction ? [] : event.tags,
      senderPubkeys: [event.pubkey],
    });
  }
}


export async function fetchDirectMessageRelays(
  ndk: NDK,
  pubkey: string,
  userMainRelays?: string[]
): Promise<UserRelayList> {

  // Step 1: Get user's outbox relays (kind 10002)
  const { fetchRelayList } = await import("@/lib/nostr");
  const outboxRelays = await fetchRelayList(ndk, pubkey);

  // Step 2: Combine discovery relays + user's outbox relays for searching
  const searchRelays = [...new Set([...discoveryRelays, ...outboxRelays])];
  const searchRelaySet = NDKRelaySet.fromRelayUrls(searchRelays, ndk);

  console.log(`[Relay Discovery] Searching for kind 10050 on ${searchRelays.length} relays (${discoveryRelays.length} discovery + ${outboxRelays.length} outbox)`);

  // Step 3: Try to find NIP-17 kind 10050 on combined relay set
  try {
    const dmRelayList = await ndk.fetchEvent({
      kinds: [NDKKind.DirectMessageReceiveRelayList],
      authors: [pubkey],
    }, {
      closeOnEose: true,
      cacheUsage: NDKSubscriptionCacheUsage.CACHE_FIRST
    }, searchRelaySet);

    if (dmRelayList) {
      const dm = Array.from(
        new Set(
          dmRelayList.tags
            .filter((tag) => tag[0] === "relay")
            .map((tag) => tag[1])
        )
      );

      if (dm.length > 0) {
        console.log(`[NIP-17] Found ${dm.length} DM relays for ${pubkey.slice(0, 8)}`);
        return {
          pubkey,
          dm,
          outbox: outboxRelays,
          fallback: [],
          source: 'nip17',
          timestamp: Date.now()
        };
      }
    }
  } catch (err) {
    console.warn(`[Relay Discovery] Failed to fetch kind 10050: ${err}`);
  }

  // Step 4: Fall back to outbox relays if kind 10050 not found
  if (outboxRelays.length > 0) {
    console.log(`[NIP-65] Using ${outboxRelays.length} outbox relays for ${pubkey.slice(0, 8)}`);
    return {
      pubkey,
      dm: [],
      outbox: outboxRelays,
      fallback: [],
      source: 'nip65',
      timestamp: Date.now()
    };
  }

  // Step 5: Fall back to discovery relays
  if (discoveryRelays.length > 0) {
    console.log(`[Fallback] Using discovery relays for ${pubkey.slice(0, 8)}`);
    return {
      pubkey,
      dm: [],
      outbox: [],
      fallback: discoveryRelays,
      source: 'discovery',
      timestamp: Date.now()
    };
  }

  // Step 6: Fall back to user's main relays
  if (userMainRelays && userMainRelays.length > 0) {
    console.log(`[Fallback] Using user main relays for ${pubkey.slice(0, 8)}`);
    return {
      pubkey,
      dm: [],
      outbox: [],
      fallback: userMainRelays,
      source: 'user-relays',
      timestamp: Date.now()
    };
  }

  // Step 7: Return empty with error (never throw)
  console.error(`[Error] No relays found for ${pubkey.slice(0, 8)} after exhaustive search`);
  return {
    pubkey,
    dm: [],
    outbox: [],
    fallback: [],
    source: 'discovery',
    error: 'No relays found after exhaustive search',
    timestamp: Date.now()
  };
}

export function saveLastSeen(ev: NostrEvent, group: PrivateGroup) {
  const ndkEvent = new NDKEvent(undefined, ev);
  const [tag, ref] = ndkEvent.tagReference();
  db.lastSeen.put({
    group: group.id,
    kind: ev.kind,
    created_at: ev.created_at,
    tag,
    ref,
  });

  // Trigger sync if enabled
  triggerLastSeenSync();
}

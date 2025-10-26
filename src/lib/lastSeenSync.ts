import NDK, { NDKEvent, NDKKind } from "@nostr-dev-kit/ndk";
import { LastSeen } from "./db";

/**
 * Kind 10029 - User Last Seen Sync
 * Replaceable event for syncing read status across devices
 */
export const KIND_LAST_SEEN_SYNC = 10029;

/**
 * Maximum allowed clock skew for timestamp validation (5 minutes)
 */
export const MAX_CLOCK_SKEW = 300; // seconds

/**
 * Minimum reasonable timestamp (Unix epoch for 2020-01-01)
 * Timestamps older than this are likely invalid
 */
const MIN_TIMESTAMP = 1577836800; // 2020-01-01

export interface LastSeenEntry {
  group: string;
  kind: number;
  created_at: number;
  tag: string;
  ref: string;
}

/**
 * Validates a LastSeenEntry object for type safety and sanity
 * @param entry - The entry to validate
 * @returns true if entry is valid, false otherwise
 */
export function validateLastSeenEntry(entry: unknown): entry is LastSeenEntry {
  if (typeof entry !== "object" || entry === null) {
    return false;
  }

  const e = entry as Record<string, unknown>;
  const now = Math.floor(Date.now() / 1000);

  return (
    typeof e.group === "string" &&
    e.group.length > 0 &&
    e.group.length < 1000 && // Reasonable max length
    typeof e.kind === "number" &&
    Number.isInteger(e.kind) &&
    e.kind >= 0 &&
    typeof e.created_at === "number" &&
    Number.isInteger(e.created_at) &&
    e.created_at >= MIN_TIMESTAMP && // Not from distant past
    e.created_at <= now + MAX_CLOCK_SKEW && // Not from future
    typeof e.tag === "string" &&
    e.tag.length < 1000 && // Reasonable max length
    typeof e.ref === "string" &&
    e.ref.length < 1000 // Reasonable max length
  );
}

/**
 * Validates that an event timestamp is within acceptable bounds
 * @param timestamp - Unix timestamp to validate
 * @param maxSkew - Maximum allowed clock skew in seconds (default: MAX_CLOCK_SKEW)
 * @returns true if timestamp is valid
 */
export function isValidEventTimestamp(
  timestamp: number | undefined,
  maxSkew: number = MAX_CLOCK_SKEW,
): boolean {
  if (!timestamp) return false;

  const now = Math.floor(Date.now() / 1000);
  return timestamp <= now + maxSkew;
}

/**
 * Determines if an event should be skipped based on sync metadata
 * @param event - The NDK event to check
 * @param lastProcessedTimestamp - Last processed event timestamp
 * @param lastPublishedTimestamp - Last published event timestamp (to skip our own)
 * @returns Object with skip flag and optional reason
 */
export function shouldSkipEvent(
  eventTimestamp: number,
  lastProcessedTimestamp: number,
  lastPublishedTimestamp: number,
): { skip: boolean; reason?: string } {
  // Skip if already processed or older
  if (eventTimestamp <= lastProcessedTimestamp) {
    return {
      skip: true,
      reason: `Already processed (event: ${eventTimestamp}, last: ${lastProcessedTimestamp})`,
    };
  }

  // Skip if this is our own published event
  if (eventTimestamp === lastPublishedTimestamp) {
    return {
      skip: true,
      reason: `Own published event (timestamp: ${eventTimestamp})`,
    };
  }

  return { skip: false };
}

/**
 * Encrypt an array of LastSeen entries using NIP-44
 */
export async function encryptLastSeenData(
  ndk: NDK,
  entries: LastSeen[],
): Promise<string> {
  const data: LastSeenEntry[] = entries.map((entry) => ({
    group: entry.group,
    kind: entry.kind,
    created_at: entry.created_at,
    tag: entry.tag || "",
    ref: entry.ref || "",
  }));

  const json = JSON.stringify(data);

  // Get the current user's pubkey
  const user = ndk.activeUser;
  if (!user) {
    throw new Error("No active user");
  }

  // Encrypt to self using NIP-44
  const signer = ndk.signer;
  if (!signer) {
    throw new Error("No signer available");
  }

  // Use NIP-44 encryption to encrypt to ourselves
  const encrypted = await signer.encrypt(user, json);
  return encrypted;
}

/**
 * Decrypt and parse LastSeen entries from NIP-44 encrypted content
 * Validates and filters out malformed entries
 */
export async function decryptLastSeenData(
  ndk: NDK,
  encryptedContent: string,
): Promise<LastSeenEntry[]> {
  const user = ndk.activeUser;
  if (!user) {
    throw new Error("No active user");
  }

  const signer = ndk.signer;
  if (!signer) {
    throw new Error("No signer available");
  }

  try {
    // Decrypt the content
    const decrypted = await signer.decrypt(user, encryptedContent);
    const data = JSON.parse(decrypted);

    // Validate the data structure
    if (!Array.isArray(data)) {
      throw new Error("Invalid data format: expected array");
    }

    // Validate and filter entries
    const validatedEntries = data.filter(validateLastSeenEntry);

    if (validatedEntries.length !== data.length) {
      const filtered = data.length - validatedEntries.length;
      console.warn(
        `[LastSeenSync] Filtered ${filtered} invalid entries from decrypted data`,
      );
    }

    return validatedEntries;
  } catch (error) {
    console.error("Failed to decrypt last seen data:", error);
    throw error;
  }
}

/**
 * Create a kind 10029 event with encrypted LastSeen data
 */
export async function createLastSeenSyncEvent(
  ndk: NDK,
  entries: LastSeen[],
): Promise<NDKEvent> {
  const user = ndk.activeUser;
  if (!user) {
    throw new Error("No active user");
  }

  // Encrypt the data
  const encryptedContent = await encryptLastSeenData(ndk, entries);

  // Create the event
  const event = new NDKEvent(ndk);
  event.kind = KIND_LAST_SEEN_SYNC as NDKKind;
  event.content = encryptedContent;
  event.tags = []; // No tags needed for this replaceable event
  event.pubkey = user.pubkey;

  // Sign the event
  await event.sign();

  return event;
}

/**
 * Parse a kind 10029 event and return the decrypted LastSeen entries
 */
export async function parseLastSeenSyncEvent(
  ndk: NDK,
  event: NDKEvent,
): Promise<LastSeenEntry[]> {
  if (event.kind !== KIND_LAST_SEEN_SYNC) {
    throw new Error(`Invalid event kind: expected ${KIND_LAST_SEEN_SYNC}`);
  }

  return await decryptLastSeenData(ndk, event.content);
}

/**
 * Fetch the current kind 10029 event for the active user
 */
export async function fetchLastSeenSyncEvent(
  ndk: NDK,
): Promise<NDKEvent | null> {
  const user = ndk.activeUser;
  if (!user) {
    return null;
  }

  try {
    const event = await ndk.fetchEvent({
      kinds: [KIND_LAST_SEEN_SYNC as NDKKind],
      authors: [user.pubkey],
    });

    return event;
  } catch (error) {
    console.error("Failed to fetch last seen sync event:", error);
    return null;
  }
}

/**
 * Merge local and remote LastSeen entries, keeping the newest created_at per group+kind
 *
 * IMPORTANT: This merge function implements last-write-wins conflict resolution.
 * Due to the read-merge-write pattern in sync operations, there's a race condition window
 * where concurrent updates from multiple devices may result in lost updates.
 *
 * Race condition scenario:
 * 1. Device A reads remote state (timestamp T1)
 * 2. Device B reads remote state (timestamp T1)
 * 3. Device B publishes update (timestamp T2)
 * 4. Device A publishes update (timestamp T3) - overwrites B's changes
 *
 * This is an acceptable trade-off for the read status sync use case, as:
 * - Read status is eventually consistent across devices
 * - The worst case is a briefly incorrect unread count
 * - Users will naturally trigger re-sync by reading messages
 *
 * For critical data, consider using parameterized replaceable events with device IDs.
 */
export function mergeLastSeenEntries(
  local: LastSeenEntry[],
  remote: LastSeenEntry[],
): LastSeenEntry[] {
  const map = new Map<string, LastSeenEntry>();

  // Helper to create composite key
  const makeKey = (entry: LastSeenEntry) => `${entry.group}:${entry.kind}`;

  // Add all entries, keeping newest per group+kind
  [...local, ...remote].forEach((entry) => {
    const key = makeKey(entry);
    const existing = map.get(key);

    if (!existing || entry.created_at > existing.created_at) {
      map.set(key, entry);
    }
  });

  return Array.from(map.values());
}

/**
 * Convert database LastSeen records to LastSeenEntry format
 */
export function lastSeenToEntry(lastSeen: LastSeen): LastSeenEntry {
  return {
    group: lastSeen.group,
    kind: lastSeen.kind,
    created_at: lastSeen.created_at,
    tag: lastSeen.tag || "",
    ref: lastSeen.ref || "",
  };
}

/**
 * Convert LastSeenEntry to database LastSeen format
 */
export function entryToLastSeen(entry: LastSeenEntry): LastSeen {
  return {
    group: entry.group,
    kind: entry.kind,
    created_at: entry.created_at,
    tag: entry.tag,
    ref: entry.ref,
  };
}

/**
 * Merges remote entries with local database and stores the result atomically
 * This is the core sync operation used by both receive and publish paths
 *
 * @param db - Dexie database instance
 * @param remoteEntries - Entries from remote source to merge
 * @returns Number of entries after merge
 */
export async function mergeAndStoreRemoteData(
  db: { lastSeen: { toArray: () => Promise<LastSeen[]>; clear: () => Promise<void>; bulkPut: (items: LastSeen[]) => Promise<void> } },
  remoteEntries: LastSeenEntry[],
): Promise<number> {
  // Get current local state
  const localLastSeen = await db.lastSeen.toArray();
  const localEntries = localLastSeen.map(lastSeenToEntry);

  // Merge with remote
  const mergedEntries = mergeLastSeenEntries(localEntries, remoteEntries);
  const mergedLastSeen = mergedEntries.map(entryToLastSeen);

  // Store atomically (transaction will be handled by caller if needed)
  await db.lastSeen.clear();
  await db.lastSeen.bulkPut(mergedLastSeen);

  return mergedEntries.length;
}

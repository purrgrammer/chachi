import { useEffect, useRef, useCallback } from "react";
import { NDKEvent, NDKSubscription } from "@nostr-dev-kit/ndk";
import { useNDK } from "@/lib/ndk";
import db, {
  getLastSeenSyncMeta,
  updateLastSeenSyncMeta,
  pruneOldLastSeenEntries,
} from "@/lib/db";
import {
  KIND_LAST_SEEN_SYNC,
  parseLastSeenSyncEvent,
  mergeLastSeenEntries,
  lastSeenToEntry,
  entryToLastSeen,
  createLastSeenSyncEvent,
  fetchLastSeenSyncEvent,
  isValidEventTimestamp,
  shouldSkipEvent,
  mergeAndStoreRemoteData,
} from "@/lib/lastSeenSync";
import {
  registerSyncTrigger,
  unregisterSyncTrigger,
} from "@/lib/lastSeenSyncTrigger";

/**
 * Hook to manage last seen sync with Nostr
 * - Subscribes to kind 10029 events on mount
 * - Merges remote changes with local state
 * - Provides function to publish local changes
 */
export function useLastSeenSync() {
  const syncEnabled = false; // Removed: unread sync feature disabled
  const ndk = useNDK();
  const subscriptionRef = useRef<NDKSubscription | null>(null);
  const publishTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Publish current local state to relays
   * Prunes old entries before sync and uses atomic transactions
   */
  const publishLastSeen = useCallback(async () => {
    if (!syncEnabled || !ndk?.activeUser) {
      return;
    }

    try {
      // Prune old entries before sync to prevent unbounded growth
      await pruneOldLastSeenEntries();

      // Fetch latest remote state
      const remoteEvent = await fetchLastSeenSyncEvent(ndk);
      let remoteEntries: Awaited<ReturnType<typeof parseLastSeenSyncEvent>> =
        [];

      if (remoteEvent) {
        try {
          remoteEntries = await parseLastSeenSyncEvent(ndk, remoteEvent);
        } catch (error) {
          console.error("Failed to parse remote event:", error);
        }
      }

      // Get local state
      const localLastSeen = await db.lastSeen.toArray();
      const localEntries = localLastSeen.map(lastSeenToEntry);

      // Merge before publishing
      const mergedEntries = mergeLastSeenEntries(localEntries, remoteEntries);
      const mergedLastSeen = mergedEntries.map(entryToLastSeen);

      // Create and publish the event
      const event = await createLastSeenSyncEvent(ndk, mergedLastSeen);

      // Publish to user's write relays
      await event.publish();

      // Store the published timestamp so we can skip it when it comes back
      if (event.created_at) {
        await updateLastSeenSyncMeta({
          lastPublishedTimestamp: event.created_at,
          lastProcessedTimestamp: event.created_at, // Also mark as processed
        });
      }

      console.log(
        `[LastSeenSync] Published ${mergedEntries.length} entries to relays (timestamp: ${event.created_at})`,
      );
    } catch (error) {
      console.error("Failed to publish last seen sync:", error);
    }
  }, [syncEnabled, ndk]);

  /**
   * Schedule a debounced publish
   * Batches multiple updates into a single publish operation
   */
  const schedulePublish = useCallback(
    (delayMs: number = 30000) => {
      if (!syncEnabled) {
        return;
      }

      // Clear existing timeout
      if (publishTimeoutRef.current) {
        clearTimeout(publishTimeoutRef.current);
      }

      // Schedule new publish with error handling
      publishTimeoutRef.current = setTimeout(async () => {
        try {
          await publishLastSeen();
        } catch (error) {
          console.error("[LastSeenSync] Scheduled publish failed:", error);
        } finally {
          publishTimeoutRef.current = null;
        }
      }, delayMs);
    },
    [syncEnabled, publishLastSeen],
  );

  /**
   * Publish immediately (for page unload, etc.)
   */
  const publishNow = () => {
    if (publishTimeoutRef.current) {
      clearTimeout(publishTimeoutRef.current);
      publishTimeoutRef.current = null;
    }
    return publishLastSeen();
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (publishTimeoutRef.current) {
        clearTimeout(publishTimeoutRef.current);
        publishTimeoutRef.current = null;
      }
    };
  }, []);

  /**
   * Handle incoming remote event with validation and atomic merge
   * Simplified using helper functions for clarity
   */
  const handleRemoteEvent = useCallback(
    async (event: NDKEvent) => {
      try {
        // Validate timestamp is within acceptable bounds
        if (!isValidEventTimestamp(event.created_at)) {
          console.warn(
            `[LastSeenSync] Rejecting invalid timestamp: ${event.created_at}`,
          );
          return;
        }

        // Get sync metadata to check if we should skip this event
        const syncMeta = await getLastSeenSyncMeta();
        const skipCheck = shouldSkipEvent(
          event.created_at!,
          syncMeta.lastProcessedTimestamp,
          syncMeta.lastPublishedTimestamp,
        );

        if (skipCheck.skip) {
          console.log(`[LastSeenSync] Skipping: ${skipCheck.reason}`);
          // Update processed timestamp for our own events to prevent re-processing
          if (event.created_at === syncMeta.lastPublishedTimestamp) {
            await updateLastSeenSyncMeta({
              lastProcessedTimestamp: event.created_at,
            });
          }
          return;
        }

        // Parse and validate remote entries
        const remoteEntries = await parseLastSeenSyncEvent(ndk, event);

        // Merge and store atomically
        const mergedCount = await db.transaction(
          "rw",
          db.lastSeen,
          async () => {
            return await mergeAndStoreRemoteData(db, remoteEntries);
          },
        );

        // Update last processed timestamp
        await updateLastSeenSyncMeta({
          lastProcessedTimestamp: event.created_at!,
        });

        console.log(
          `[LastSeenSync] Merged ${mergedCount} entries from remote (event: ${event.id})`,
        );
      } catch (error) {
        console.error(
          `[LastSeenSync] Failed to process event ${event.id}:`,
          error,
        );
      }
    },
    [ndk],
  );

  // Register the sync trigger callback
  useEffect(() => {
    if (!syncEnabled) {
      unregisterSyncTrigger();
      return;
    }

    registerSyncTrigger(schedulePublish);

    return () => {
      unregisterSyncTrigger();
    };
  }, [syncEnabled, schedulePublish]);

  // Subscribe to kind 10029 events
  useEffect(() => {
    if (!syncEnabled || !ndk?.activeUser) {
      return;
    }

    const user = ndk.activeUser;
    let cancelled = false;

    // Initialize subscription with last processed timestamp
    async function initSubscription() {
      if (cancelled) return;

      const syncMeta = await getLastSeenSyncMeta();
      if (cancelled) return;

      // Fetch the most recent event first
      try {
        const event = await fetchLastSeenSyncEvent(ndk);
        if (cancelled) return;

        if (event) {
          await handleRemoteEvent(event);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to fetch initial last seen sync event:", error);
        }
      }

      if (cancelled) return;

      // Subscribe to future updates, only events newer than last processed
      const filter = {
        kinds: [KIND_LAST_SEEN_SYNC],
        authors: [user.pubkey],
        // Only subscribe to events newer than last processed
        ...(syncMeta.lastProcessedTimestamp > 0 && {
          since: syncMeta.lastProcessedTimestamp + 1,
        }),
      };

      console.log(
        `[LastSeenSync] Subscribing to events since timestamp ${syncMeta.lastProcessedTimestamp}`,
      );

      const subscription = ndk.subscribe(filter, { closeOnEose: false });

      subscription.on("event", async (event: NDKEvent) => {
        if (cancelled) return;
        try {
          await handleRemoteEvent(event);
        } catch (error) {
          console.error(
            "[LastSeenSync] Failed to process event:",
            event.id,
            error,
          );
        }
      });

      subscriptionRef.current = subscription;
    }

    initSubscription();

    return () => {
      cancelled = true;
      if (subscriptionRef.current) {
        subscriptionRef.current.stop();
        subscriptionRef.current = null;
      }
    };
  }, [syncEnabled, ndk, handleRemoteEvent]);

  return {
    publishLastSeen: schedulePublish,
    publishNow,
    syncEnabled,
  };
}

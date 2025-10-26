/**
 * Global trigger for last seen sync
 * This allows non-React code to request a sync publish
 */

type SyncTriggerCallback = () => void;

let syncCallback: SyncTriggerCallback | null = null;
let registrationCount = 0;

/**
 * Register the sync callback (called by useLastSeenSync hook)
 * Uses reference counting to handle multiple mounts/unmounts safely
 * @returns Cleanup function to unregister this specific registration
 */
export function registerSyncTrigger(
  callback: SyncTriggerCallback,
): () => void {
  // Warn if overwriting a different callback
  if (syncCallback && syncCallback !== callback) {
    console.warn(
      "[LastSeenSync] Overwriting existing sync callback. This may indicate multiple hook instances.",
    );
  }

  syncCallback = callback;
  registrationCount++;

  // Return cleanup function
  return () => {
    registrationCount--;
    if (registrationCount === 0) {
      syncCallback = null;
    }
  };
}

/**
 * Unregister the sync callback
 * Decrements registration count and clears callback when count reaches zero
 */
export function unregisterSyncTrigger() {
  registrationCount--;
  if (registrationCount <= 0) {
    registrationCount = 0;
    syncCallback = null;
  }
}

/**
 * Trigger a debounced sync publish
 * Can be called from anywhere in the app
 */
export function triggerLastSeenSync() {
  if (syncCallback) {
    syncCallback();
  }
}

import { useEffect } from "react";
import { useLastSeenSync } from "@/hooks/useLastSeenSync";

/**
 * Component that manages last seen sync lifecycle
 * - Subscribes to remote updates
 * - Publishes on page visibility change
 * - Publishes on page unload
 */
export function LastSeenSyncProvider() {
  const { publishNow, syncEnabled } = useLastSeenSync();

  useEffect(() => {
    if (!syncEnabled) {
      return;
    }

    // Publish when page is hidden
    const handleVisibilityChange = () => {
      if (document.hidden) {
        publishNow();
      }
    };

    // Publish before page unload
    const handleBeforeUnload = () => {
      publishNow();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [publishNow, syncEnabled]);

  // This component doesn't render anything
  return null;
}

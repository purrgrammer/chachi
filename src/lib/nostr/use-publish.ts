/**
 * Publishing hooks for Nostr events
 *
 * This module provides hooks for publishing events to Nostr relays.
 * It handles NDK integration, signing, and relay management.
 */

import { useCallback } from "react";
import { NDKEvent, NDKRelaySet } from "@nostr-dev-kit/ndk";
import type { NostrEvent } from "nostr-tools";
import { useNDK } from "@/lib/ndk";
import type { EventTemplate } from "./event-builders";

/**
 * Base hook for publishing events
 *
 * This hook handles the NDK integration for signing and publishing events.
 * It accepts an EventTemplate (unsigned event) and optional relay URLs.
 *
 * @returns A function that publishes an event and returns the signed NostrEvent
 *
 * @example
 * ```ts
 * const publish = usePublishEvent();
 * const template = buildReactionEvent("+", targetEvent);
 * const published = await publish(template, ["wss://relay.example.com"]);
 * ```
 */
export function usePublishEvent() {
  const ndk = useNDK();

  return useCallback(
    async (
      template: EventTemplate,
      relays?: string[],
    ): Promise<NostrEvent> => {
      console.log("[usePublishEvent] Publishing with relays:", relays);

      // Create NDK event from template
      const ndkEvent = new NDKEvent(ndk, template as NostrEvent);

      // Publish to specified relays or default relays
      if (relays && relays.length > 0) {
        // Filter out invalid relay URLs
        const validRelays = relays.filter((relay) => {
          try {
            new URL(relay);
            return true;
          } catch (err) {
            console.warn("[usePublishEvent] Invalid relay URL filtered out:", relay, err);
            return false;
          }
        });

        console.log("[usePublishEvent] Valid relays after filtering:", validRelays);

        if (validRelays.length > 0) {
          const relaySet = NDKRelaySet.fromRelayUrls(validRelays, ndk);
          console.log("[usePublishEvent] Publishing to relay set");
          await ndkEvent.publish(relaySet);
        } else {
          console.warn("[usePublishEvent] No valid relays, falling back to default");
          // Fall back to default relays if no valid relays provided
          await ndkEvent.publish();
        }
      } else {
        console.log("[usePublishEvent] No relays specified, using default");
        await ndkEvent.publish();
      }

      console.log("[usePublishEvent] Event published successfully:", ndkEvent.id);
      // Return the signed event as NostrEvent
      return ndkEvent.rawEvent() as NostrEvent;
    },
    [ndk],
  );
}

/**
 * Hook for publishing events with automatic relay set management
 *
 * This is a convenience hook that uses the relay set from another hook
 * (like useRelaySet) for publishing.
 *
 * @param relaySet - NDKRelaySet to publish to
 * @returns A function that publishes an event
 *
 * @example
 * ```ts
 * const relaySet = useRelaySet(userRelays);
 * const publish = usePublishEventToRelaySet(relaySet);
 * const template = buildTextEvent("Hello, Nostr!");
 * await publish(template);
 * ```
 */
export function usePublishEventToRelaySet(relaySet: NDKRelaySet) {
  const ndk = useNDK();

  return useCallback(
    async (template: EventTemplate): Promise<NostrEvent> => {
      const ndkEvent = new NDKEvent(ndk, template as NostrEvent);
      await ndkEvent.publish(relaySet);
      return ndkEvent.rawEvent() as NostrEvent;
    },
    [ndk, relaySet],
  );
}

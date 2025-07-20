import { useCallback } from "react";
import { toast } from "sonner";
import { NDKEvent, NDKKind } from "@nostr-dev-kit/ndk";
import { NostrEvent } from "nostr-tools";
import { useNDK } from "@/lib/ndk";
import { useRelays, useRelaySet } from "@/lib/nostr";
import type { Group } from "@/lib/types";
import type { Emoji } from "@/components/emoji-picker";

export function useReact(
  event: NostrEvent,
  group?: Group,
  errorMessage?: string,
) {
  const ndk = useNDK();
  const relays = useRelays();
  const relaySet = useRelaySet(group ? [group.relay] : relays);

  const react = useCallback(async (e: Emoji) => {
    try {
      const ev = new NDKEvent(ndk, {
        kind: NDKKind.Reaction,
        content: e.native ? e.native : e.shortcodes,
        tags: group ? [["h", group?.id, group?.relay]] : [],
      } as NostrEvent);
      ev.tag(new NDKEvent(ndk, event));
      if (e.src) {
        if (e.address) {
          ev.tags.push(["emoji", e.name, e.src, e.address]);
        } else {
          ev.tags.push(["emoji", e.name, e.src]);
        }
      }
      await ev.publish(relaySet);
    } catch (err) {
      console.error(err);
      if (errorMessage) {
        toast.error(errorMessage);
      }
    }
  }, []);
  return react;
}

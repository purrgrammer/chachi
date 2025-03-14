import { NostrEvent } from "nostr-tools";
import { NDKEvent, NDKKind } from "@nostr-dev-kit/ndk";
import { useNDK } from "@/lib/ndk";
import { useStream } from "@/lib/nostr";
import type { Group } from "@/lib/types";

export function useReplies(event: NostrEvent, group?: Group, live = true) {
  const ndk = useNDK();
  const ev = new NDKEvent(ndk, event);
  return useStream(
    {
      kinds: [1111 as NDKKind, NDKKind.Nutzap, NDKKind.Zap],
      ...(group ? { "#h": [group.id] } : {}),
      ...ev.filter(),
    },
    group ? [group.relay] : [],
    live,
    true,
  );
}

export function useDirectReplies(
  event: NostrEvent,
  group?: Group,
  live = true,
) {
  const ndk = useNDK();
  const ev = new NDKEvent(ndk, event);
  const [t, v] = ev.tagReference();
  return useStream(
    [
      {
        kinds: [1111 as NDKKind],
        ...(group ? { "#h": [group.id] } : {}),
        [`#${t.toUpperCase()}`]: [v],
      },
      {
        kinds: [NDKKind.Zap, NDKKind.Nutzap],
        ...(group ? { "#h": [group.id] } : {}),
        ...ev.filter(),
      },
    ],
    group ? [group.relay] : [],
    live,
    true,
  );
}

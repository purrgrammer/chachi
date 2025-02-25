import { nip19 } from "nostr-tools";
import type { NostrEvent } from "nostr-tools";
import type { Group } from "@/lib/types";
import { getRelayHost } from "@/lib/relay";

export function eventLink(ev: NostrEvent, group?: Group) {
  // todo: group events, addresses
  const nlink = nip19.neventEncode({
    id: ev.id,
    kind: ev.kind,
    relays: group ? [group.relay] : [],
    author: ev.pubkey,
  });
  // todo: by kind
  if (group) {
    return group.id === "_"
      ? `/${getRelayHost(group.relay)}/e/${nlink}`
      : `/${getRelayHost(group.relay)}/${group.id}/e/${nlink}`;
  }
  return `/e/${nlink}`;
}

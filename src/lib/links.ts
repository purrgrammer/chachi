import { NDKEvent } from "@nostr-dev-kit/ndk";
import type { NostrEvent } from "nostr-tools";
import type { Group } from "@/lib/types";
import { getRelayHost } from "@/lib/relay";
import { ndk } from "@/lib/ndk";

export function eventLink(ev: NostrEvent, group?: Group) {
  const isFromGroup =
    group && ev.tags.find((t) => t[0] === "h" && t[1] === group.id);
  const event = new NDKEvent(ndk, ev);
  const nlink = event.encode();
  if (isFromGroup) {
    return group.id === "_"
      ? `/${getRelayHost(group.relay)}/e/${nlink}`
      : `/${getRelayHost(group.relay)}/${group.id}/e/${nlink}`;
  }
  return `/e/${nlink}`;
}

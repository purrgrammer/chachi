import { useEvent } from "@/lib/nostr";
import { Embed } from "@/components/nostr/detail";
import type { Group } from "@/lib/types";

export function Event({
  id,
  relays,
  group,
  className,
}: {
  id: string;
  relays: string[];
  group: Group;
  className?: string;
}) {
  const { data: event } = useEvent({ id, relays });
  return event ? (
    <Embed event={event} group={group} className={className} />
  ) : null;
}

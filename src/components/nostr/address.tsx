import { useAddress } from "@/lib/nostr";
import { Embed } from "@/components/nostr/detail";
import { Group } from "@/lib/types";

export function Address({
  group,
  pubkey,
  kind,
  identifier,
  relays,
  className,
}: {
  group: Group;
  pubkey: string;
  kind: number;
  identifier: string;
  relays: string[];
  className?: string;
}) {
  const { data: event } = useAddress({ pubkey, kind, identifier, relays });
  return event ? (
    <Embed event={event} group={group} className={className} relays={relays} />
  ) : null;
}

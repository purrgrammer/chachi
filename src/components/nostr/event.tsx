import { useEvent, useAddress } from "@/lib/nostr";
import { SearchSlash, Network, Ban } from "lucide-react";
import { Embed } from "@/components/nostr/detail";
import type { Group } from "@/lib/types";

function LoadingEvent() {
  return (
    <div className="flex flex-row gap-3 items-center px-4 py-2 border rounded-sm text-muted-foreground bg-background">
      <Network className="size-4 animate-pulse" />
      <span className="text-sm italic">Loading event</span>
    </div>
  );
}

function EventNotFound() {
  return (
    <div className="flex flex-row gap-3 items-center px-4 py-2 border rounded-sm text-muted-foreground bg-background">
      <SearchSlash className="size-4" />
      <span className="text-sm italic">Event not found</span>
    </div>
  );
}

function EventFetchError() {
  return (
    <div className="flex flex-row gap-3 items-center px-4 py-2 border rounded-sm text-muted-foreground bg-background">
      <Ban className="size-4" />
      <span className="text-sm italic">Error fetching event</span>
    </div>
  );
}

export function Event({
  id,
  relays,
  group,
  pubkey,
  className,
}: {
  id: string;
  relays: string[];
  pubkey?: string;
  group: Group;
  className?: string;
}) {
  const { data: event, status } = useEvent({ id, pubkey, relays });

  if (status === "pending") {
    return <LoadingEvent />;
  }

  if (status === "error") {
    return <EventFetchError />;
  }

  if (status === "success" && !event) {
    return <EventNotFound />;
  }

  return event ? (
    <Embed event={event} group={group} className={className} relays={relays} />
  ) : (
    <EventNotFound />
  );
}

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
  const { data: event, status } = useAddress({
    pubkey,
    kind,
    identifier,
    relays,
  });

  if (status === "pending") {
    return <LoadingEvent />;
  }

  if (status === "error") {
    return <EventFetchError />;
  }

  if (status === "success" && !event) {
    return <EventNotFound />;
  }

  return event ? (
    <Embed event={event} group={group} className={className} relays={relays} />
  ) : (
    <EventNotFound />
  );
}

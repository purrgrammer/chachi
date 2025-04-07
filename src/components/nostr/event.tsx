import { useEvent, useAddress } from "@/lib/nostr";
import { NostrEvent } from "nostr-tools";
import { SearchSlash, Network, Ban } from "lucide-react";
import { Embed } from "@/components/nostr/detail";
import type { Group } from "@/lib/types";
import { useTranslation } from "react-i18next";

function LoadingEvent() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-row gap-3 items-center py-2 px-4 rounded-sm border text-muted-foreground bg-background w-full">
      <Network className="animate-pulse size-4" />
      <span className="text-sm italic">{t("event.loading")}</span>
    </div>
  );
}

function EventNotFound() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-row gap-3 items-center py-2 px-4 rounded-sm border text-muted-foreground bg-background w-full">
      <SearchSlash className="size-4" />
      <span className="text-sm italic">{t("event.not-found")}</span>
    </div>
  );
}

function EventFetchError() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-row gap-3 items-center py-2 px-4 rounded-sm border text-muted-foreground bg-background w-full">
      <Ban className="size-4" />
      <span className="text-sm italic">{t("event.fetch-error")}</span>
    </div>
  );
}

export function Event({
  id,
  relays,
  group,
  pubkey,
  className,
  showReactions = true,
  asReply,
  asLink,
  onClick,
}: {
  id: string;
  relays: string[];
  pubkey?: string;
  group?: Group;
  className?: string;
  showReactions?: boolean;
  asReply?: boolean;
  asLink?: boolean;
  onClick?: (ev: NostrEvent) => void;
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
    <Embed
      event={event}
      group={group}
      className={className}
      relays={relays}
      showReactions={showReactions}
      asReply={asReply}
      asLink={asLink}
      onClick={onClick}
    />
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
  showReactions = true,
  asReply,
  onClick,
}: {
  group?: Group;
  pubkey: string;
  kind: number;
  identifier: string;
  relays: string[];
  className?: string;
  showReactions?: boolean;
  asReply?: boolean;
  onClick?: (ev: NostrEvent) => void;
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
    <Embed
      event={event}
      group={group}
      className={className}
      relays={relays}
      showReactions={showReactions}
      asReply={asReply}
      onClick={onClick}
    />
  ) : (
    <EventNotFound />
  );
}

export function E({
  id,
  group,
  className,
  pubkey,
  relays,
  showReactions,
  asReply,
  asLink,
  onClick,
}: {
  id: string;
  pubkey?: string;
  className?: string;
  group?: Group;
  relays?: string[];
  showReactions?: boolean;
  asReply?: boolean;
  asLink?: boolean;
  onClick?: (ev: NostrEvent) => void;
}) {
  return (
    <Event
      id={id}
      group={group}
      pubkey={pubkey}
      relays={relays ? relays : group ? [group.relay] : []}
      showReactions={showReactions}
      asReply={asReply}
      asLink={asLink}
      onClick={onClick}
      className={className}
    />
  );
}

export function A({
  address,
  group,
  relays,
  showReactions,
  asReply,
  onClick,
}: {
  address: string;
  group?: Group;
  relays?: string[];
  showReactions?: boolean;
  asReply?: boolean;
  onClick?: (ev: NostrEvent) => void;
}) {
  const [k, pubkey, d] = address.split(":");
  return (
    <Address
      kind={Number(k)}
      pubkey={pubkey}
      identifier={d}
      group={group}
      relays={relays ? relays : group ? [group.relay] : []}
      showReactions={showReactions}
      asReply={asReply}
      onClick={onClick}
    />
  );
}

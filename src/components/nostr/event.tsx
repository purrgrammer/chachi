import { useEvent, useAddress } from "@/lib/nostr";
import { SearchSlash, Network, Ban } from "lucide-react";
import { Embed } from "@/components/nostr/detail";
import type { Group } from "@/lib/types";
import { useTranslation } from "react-i18next";

function LoadingEvent() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-row gap-3 items-center py-2 px-4 rounded-sm border text-muted-foreground bg-background">
      <Network className="animate-pulse size-4" />
      <span className="text-sm italic">{t("event.loading")}</span>
    </div>
  );
}

function EventNotFound() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-row gap-3 items-center py-2 px-4 rounded-sm border text-muted-foreground bg-background">
      <SearchSlash className="size-4" />
      <span className="text-sm italic">{t("event.not-found")}</span>
    </div>
  );
}

function EventFetchError() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-row gap-3 items-center py-2 px-4 rounded-sm border text-muted-foreground bg-background">
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
}: {
  id: string;
  relays: string[];
  pubkey?: string;
  group?: Group;
  className?: string;
  showReactions?: boolean;
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
}: {
  group?: Group;
  pubkey: string;
  kind: number;
  identifier: string;
  relays: string[];
  className?: string;
  showReactions?: boolean;
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
    />
  ) : (
    <EventNotFound />
  );
}

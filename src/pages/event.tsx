import { useParams } from "react-router-dom";
import { useNostrLink } from "@/lib/nostr";
import { EventDetail } from "@/components/nostr/detail";
import type { Group } from "@/lib/types";
import { useTranslation } from "react-i18next";
import { Loading } from "@/components/loading";

export function WrongLink() {
  const { t } = useTranslation();
  return <span>{t("event.link-not-recognized")}</span>;
}

function EventDetailPage({ group, nlink }: { group?: Group; nlink: string }) {
  const { event, relays, error } = useNostrLink(nlink);
  return event ? (
    <EventDetail key={event.id} event={event} group={group} relays={relays} />
  ) : error ? (
    <WrongLink />
  ) : (
    <Loading className="my-16" />
  );
}

export default function EventPage() {
  const { host, id, nlink } = useParams();
  const group = host
    ? {
        id: id || "_",
        relay: `wss://${host}`,
      }
    : undefined;
  // todo: error handling
  return nlink ? (
    <EventDetailPage group={group} nlink={nlink} />
  ) : (
    <WrongLink />
  );
}

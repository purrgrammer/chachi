import { useParams } from "react-router-dom";
import { useNostrLink } from "@/lib/nostr";
import { EventDetail } from "@/components/nostr/detail";
import type { Group } from "@/lib/types";

// todo: error page
function WrongLink() {
  return <span>Link not recognized</span>;
}

function EventDetailPage({ group, nlink }: { group?: Group; nlink: string }) {
  // todo: loading state
  const { event, relays, error } = useNostrLink(nlink);
  return event ? (
    <EventDetail key={event.id} event={event} group={group} relays={relays} />
  ) : error ? (
    <WrongLink />
  ) : null;
}

export default function EventPage() {
  const { host, id, nlink } = useParams();
  const group =
    host && id
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

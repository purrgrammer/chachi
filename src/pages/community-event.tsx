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

export default function CommunityEventPage() {
  const { pubkey, nlink } = useParams();
  const group = pubkey
    ? {
        id: pubkey || "_",
        isCommunity: true,
      }
    : undefined;
  // todo: error handling
  return nlink && group ? (
    <EventDetailPage group={group} nlink={nlink} />
  ) : (
    <WrongLink />
  );
}

import { useParams } from "react-router-dom";
import { useNostrLink } from "@/lib/nostr";
import { EventDetail } from "@/components/nostr/detail";
import type { Group } from "@/lib/types";
import { useCommunity } from "@/lib/nostr/groups";

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

function CommunityEventPageContent({
  pubkey,
  nlink,
}: {
  pubkey: string;
  nlink: string;
}) {
  const community = useCommunity(pubkey);
  if (!community) {
    return <WrongLink />;
  }
  return (
    <EventDetailPage
      group={{
        id: community.pubkey,
        isCommunity: true,
        relay: community.relay,
      }}
      nlink={nlink}
    />
  );
}

export default function CommunityEventPage() {
  const { pubkey, nlink } = useParams();
  // todo: validate pubkey and nlink
  return nlink && pubkey ? (
    <CommunityEventPageContent pubkey={pubkey} nlink={nlink} />
  ) : (
    <WrongLink />
  );
}

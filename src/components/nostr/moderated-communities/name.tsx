import { useAddress, useRelays } from "@/lib/nostr";
import { Users } from "lucide-react";
import { Link } from "react-router-dom";
import { nip19 } from "nostr-tools";
import { useMemo } from "react";

export function ModeratedCommunityName({ address }: { address: string }) {
  const [kind, pubkey, identifier] = address.split(":");
  const nembed = useMemo(
    () => nip19.naddrEncode({ pubkey, kind: Number(kind), identifier }),
    [address],
  );
  const relays = useRelays();
  const { data: event } = useAddress({
    pubkey,
    kind: Number(kind),
    identifier,
    relays,
  });

  if (!event) {
    return (
      <span className="text-primary-foreground hover:underline hover:decoration-dotted">
        {identifier}
      </span>
    );
  }

  const name = event.tags.find((t) => t[0] === "name")?.[1];

  return (
    <Link to={`/e/${nembed}`}>
      <div className="flex flex-row items-center gap-1">
        <Users className="size-3" />
        <span className="text-primary-foreground hover:underline hover:decoration-dotted">
          {name}
        </span>
      </div>
    </Link>
  );
}

import { NostrEvent } from "nostr-tools";
import { RelayLink } from "./relay";
import { isRelayURL } from "@/lib/relay";

export default function RelayList({ event }: { event: NostrEvent }) {
  const title = event.tags.find((t) => t[0] === "title")?.[1];
  const description = event.tags.find((t) => t[0] === "description")?.[1];
  const relays = event.tags
    .filter((t) => t[0] === "r" && isRelayURL(t[1]))
    .map((t) => t[1]);
  return (
    <div className="flex flex-col gap-2">
      {title && <h3 className="text-lg font-bold">{title}</h3>}
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
      {relays.map((relay) => (
        <RelayLink key={relay} relay={relay} />
      ))}
    </div>
  );
}

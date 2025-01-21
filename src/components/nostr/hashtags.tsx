import { NostrEvent } from "nostr-tools";
import { Badge } from "@/components/ui/badge";

export default function Hashtags({
  event,
  max = 3,
}: {
  event: NostrEvent;
  max?: number;
}) {
  const tags = event.tags
    .filter((t) => t[0] === "t")
    .map((t) => t[1])
    .filter(Boolean)
    .filter((t) => !t.startsWith("internal:"));

  return tags.length > 0 ? (
    <div className="flex flex-row flex-wrap">
      {tags.slice(0, max).map((tag) => (
        <Badge key={tag} variant="tag" className="mr-1 last:mr-0 font-light">
          {tag}
        </Badge>
      ))}
    </div>
  ) : null;
}

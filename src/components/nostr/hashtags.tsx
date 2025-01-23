import { NostrEvent } from "nostr-tools";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function Hashtags({
  event,
  className,
  max = 3,
}: {
  event: NostrEvent;
  className?: string;
  max?: number;
}) {
  const tags = event.tags
    .filter((t) => t[0] === "t")
    .map((t) => t[1])
    .filter(Boolean)
    .filter((t) => !t.startsWith("internal:"));

  return tags.length > 0 ? (
    <div className={cn("flex flex-row flex-wrap", className)}>
      {tags.slice(0, max).map((tag) => (
        <Badge key={tag} variant="tag" className="mr-1 last:mr-0 font-light">
          {tag}
        </Badge>
      ))}
    </div>
  ) : null;
}

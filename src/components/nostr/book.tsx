import { NostrEvent } from "nostr-tools";
import { cn } from "@/lib/utils";
//import type { Group } from "@/lib/types";

export function Book({
  event,
  //group,
  className,
}: {
  event: NostrEvent;
  //group: Group;
  className?: string;
}) {
  const title = event.tags.find((tag) => tag[0] === "title")?.[1];
  const author = event.tags.find((tag) => tag[0] === "author")?.[1];
  return (
    <div className={cn("flex flex-col", className)}>
      <h3 className="text-lg">{title}</h3>
      <h4 className="text-md text-muted-foreground">{author}</h4>
    </div>
  );
}

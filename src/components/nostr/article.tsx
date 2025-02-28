import { NostrEvent } from "nostr-tools";
import { Markdown } from "@/components/markdown";
import { cn } from "@/lib/utils";
import type { Group } from "@/lib/types";

export function ArticleSummary({
  event,
  className,
}: {
  event: NostrEvent;
  className?: string;
}) {
  const title = event.tags.find((tag) => tag[0] === "title")?.[1];
  const summary = event.tags.find((tag) => tag[0] === "summary")?.[1];
  const image = event.tags.find((tag) => tag[0] === "image")?.[1];
  return (
    <div className={cn("flex flex-col", className)}>
      {image ? (
        <img
          src={image}
          className="w-full aspect-auto max-h-[210px] object-cover"
        />
      ) : null}

      <div className="flex flex-col gap-2 mt-2">
        <h3 className="text-lg">{title}</h3>
        {summary ? (
          <p className="text-md text-muted-foreground line-clamp-3">
            {summary}
          </p>
        ) : null}
      </div>
    </div>
  );
}

// todo: scroll on mobile
// todo: NostrEvent
export function Article({
  event,
  group,
  className,
}: {
  event: NostrEvent;
  group?: Group;
  className?: string;
}) {
  // todo: communities list
  // todo: default image
  // todo: smooth scroll footnotes
  // todo: max width
  return (
    <div className={cn("flex flex-col p-2", className)}>
      <Markdown group={group} tags={event.tags}>
        {event.content}
      </Markdown>
    </div>
  );
}

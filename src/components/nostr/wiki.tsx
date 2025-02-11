import { NostrEvent } from "nostr-tools";
import Asciidoc from "@/components/asciidoc";
import { cn } from "@/lib/utils";

export function WikiPreview({
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

export function WikiDetail({ event }: { event: NostrEvent }) {
  return <Asciidoc content={event.content} />;
}

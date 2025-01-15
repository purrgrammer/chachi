import { NostrEvent } from "nostr-tools";
import { ImagePlay } from "lucide-react";
import Gallery from "@/components/gallery";

export function GIFSet({ event }: { event: NostrEvent }) {
  const title = event.tags.find((t) => t[0] === "title")?.[1];
  const description = event.tags.find((t) => t[0] === "description")?.[1];
  const identifier = event.tags.find((t) => t[0] === "d")?.[1];
  const gifs = event.tags.filter((t) => t[0] === "imeta");
  return (
    <div className="flex flex-col gap-1">
      <h4 className="text-xl font-semibold">{title || identifier}</h4>
      {description ? (
        <p className="text-md text-muted-foreground line-clamp-3">
          {description}
        </p>
      ) : null}
      <Gallery
        imetas={gifs}
        Icon={ImagePlay}
        className="min-w-[286px] sm:min-w-[446px] -ml-4 -mr-4"
      />
    </div>
  );
}

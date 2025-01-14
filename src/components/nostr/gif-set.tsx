import { useMemo } from "react";
import { NostrEvent } from "nostr-tools";
import { ImagePlay } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { parseImeta } from "@/lib/media";

function GIF({ imeta }: { imeta: string[] }) {
  const gif = useMemo(() => parseImeta(imeta), [imeta]);
  return gif ? <img className="rounded-sm aspect-video" src={gif.url} /> : null;
}

export function GIFSet({ event }: { event: NostrEvent }) {
  const title = event.tags.find((t) => t[0] === "title")?.[1];
  const identifier = event.tags.find((t) => t[0] === "d")?.[1];
  const gifs = event.tags.filter((t) => t[0] === "imeta");
  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-row justify-between items-center">
        <h4 className="text-xl font-semibold">{title || identifier}</h4>
        <div className="flex flex-row items-center gap-1 text-muted-foreground">
          <ImagePlay className="size-4" />
          <span className="text-xs font-mono">{gifs.length}</span>
        </div>
      </div>
      {gifs.length > 2 ? (
        <ScrollArea>
          <div className="grid grid-cols-2 gap-2 h-72">
            {gifs.map((gif, idx) => (
              <GIF key={idx} imeta={gif} />
            ))}
          </div>
        </ScrollArea>
      ) : (
        <div className="grid grid-cols-2 gap-2 h-28">
          {gifs.map((gif, idx) => (
            <GIF key={idx} imeta={gif} />
          ))}
        </div>
      )}
    </div>
  );
}

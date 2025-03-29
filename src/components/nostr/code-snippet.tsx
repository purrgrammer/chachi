import { NostrEvent } from "nostr-tools";
import { LazyCodeBlock } from "@/components/lazy-code-block";
import { SquareDashedBottomCode } from "lucide-react";

export default function CodeSnippet({ event }: { event: NostrEvent }) {
  const language = event.tags.find((t) => t[0] === "l")?.[1];
  const name = event.tags.find((t) => t[0] === "name")?.[1];
  const code = event.content;
  return (
    <div className="flex flex-col gap-0">
      {name ? (
        <div className="flex flex-row gap-2 items-center">
          <SquareDashedBottomCode className="size-4 text-muted-foreground" />
          <h3 className="text-md line-clamp-1">{name}</h3>
        </div>
      ) : null}
      <LazyCodeBlock language={language} code={code} />
    </div>
  );
}

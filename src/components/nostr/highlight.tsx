import { useMemo } from "react";
import { Link } from "lucide-react";
import { NDKKind } from "@nostr-dev-kit/ndk";
import { NostrEvent } from "nostr-tools";
import { Avatar } from "@/components/nostr/avatar";
import { Name } from "@/components/nostr/name";
import { cn } from "@/lib/utils";
import { useERef, useARef } from "@/lib/nostr";

function Author({ pubkey }: { pubkey: string }) {
  return (
    <div className="flex gap-1.5 items-center">
      <Avatar pubkey={pubkey} className="size-5" />
      <span className="text-sm font-semibold">
        <Name pubkey={pubkey} />
      </span>
    </div>
  );
}

function ARef({ author, tag }: { author?: string; tag: string[] }) {
  const { data: event } = useARef(tag);
  return event && event?.kind === NDKKind.Article ? (
    <div className="flex gap-1.5 items-center">
      <Avatar pubkey={event.pubkey} className="size-5" />
      <span className="text-sm font-semibold">
        {event.tags.find((t) => t[0] === "title")?.[1]}
      </span>
    </div>
  ) : author ? (
    <Author pubkey={author} />
  ) : null;
}

function ERef({ author, tag }: { author?: string; tag: string[] }) {
  const { data: event } = useERef(tag);
  // todo: optionally show original event
  return event ? (
    <Author pubkey={event.pubkey} />
  ) : author ? (
    <Author pubkey={author} />
  ) : null;
}

function Website({ event, url }: { event: NostrEvent; url: string }) {
  const href = useMemo(() => {
    try {
      const u = new URL(url);
      return `${u.host}${u.pathname}`;
    } catch {
      return url;
    }
  }, [url]);
  return (
    <div className="flex gap-1.5 items-center">
      <Link className="size-3" />
      <a
        href={`${url}#~:text:=${encodeURIComponent(event.content)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm underline decoration-dotted"
      >
        {href}
      </a>
    </div>
  );
}

// todo: generalize event embed container
export function Highlight({
  event,
  className,
}: {
  event: NostrEvent;
  className?: string;
}) {
  // todo: don't display query params
  const website = event.tags.find((tag) => tag[0] === "r")?.[1];
  const a = event.tags.find((tag) => tag[0] === "a");
  const e = event.tags.find((tag) => tag[0] === "e");
  const author = event.tags.find((tag) => tag[0] === "p")?.[1];
  return (
    <div className={cn("flex flex-col gap-2 items-start", className)}>
      <blockquote className="border-l-4 border-neutral-500/60 dark:border-neutral-100/50 pl-4 py-1 leading-tight">
        {event.content}
      </blockquote>
      {website ? (
        <Website event={event} url={website} />
      ) : a ? (
        <ARef author={author} tag={a} />
      ) : e ? (
        <ERef author={author} tag={e} />
      ) : author ? (
        <Author pubkey={author} />
      ) : null}
    </div>
  );
}

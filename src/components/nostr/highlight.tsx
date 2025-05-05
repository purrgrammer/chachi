import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Link as LinkIcon } from "lucide-react";
import { NDKKind } from "@nostr-dev-kit/ndk";
import { NostrEvent } from "nostr-tools";
import { User } from "@/components/nostr/user";
import { cn } from "@/lib/utils";
import { useERef, useARef } from "@/lib/nostr";
import { eventLink } from "@/lib/links";

function ArticleLink({ event }: { event: NostrEvent }) {
  return (
    <Link
      to={eventLink(event)}
      className="hover:underline hover:decoration-dotted"
    >
      <div className="flex gap-1.5 items-center">
        <User
          pubkey={event.pubkey}
          classNames={{ avatar: "size-4", name: "hidden" }}
        />
        <h3 className="text-md font-normal">
          {event.tags.find((t) => t[0] === "title")?.[1]}
        </h3>
      </div>
    </Link>
  );
}

function ARef({ author, tag }: { author?: string; tag: string[] }) {
  const { data: event } = useARef(tag);
  return event && event?.kind === NDKKind.Article ? (
    <ArticleLink event={event} />
  ) : author ? (
    <User
      pubkey={author}
      classNames={{ avatar: "size-5", name: "text-sm font-semibold" }}
    />
  ) : null;
}

function ERef({ author, tag }: { author?: string; tag: string[] }) {
  const { data: event } = useERef(tag);
  // todo: optionally show original event
  return event ? (
    <User
      pubkey={event.pubkey}
      classNames={{ avatar: "size-5", name: "text-sm font-semibold" }}
    />
  ) : author ? (
    <User
      pubkey={author}
      classNames={{ avatar: "size-5", name: "text-sm font-semibold" }}
    />
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
      <LinkIcon className="size-4 text-muted-foreground" />
      <Link
        to={`${url}#:~:text=${encodeURIComponent(event.content)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="hover:underline hover:decoration-dotted line-clamp-1 break-all"
      >
        {href}
      </Link>
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
        <User
          pubkey={author}
          classNames={{ avatar: "size-5", name: "text-sm font-semibold" }}
        />
      ) : null}
    </div>
  );
}

import React, { Suspense } from "react";
import { useTranslation } from "react-i18next";
import { NostrEvent } from "nostr-tools";
import { BookCopy, BookOpen as BookIcon } from "lucide-react";
import Hashtags from "@/components/nostr/hashtags";
import { RichText } from "@/components/rich-text";
import { BOOK, BOOK_CONTENT } from "@/lib/kinds";
import { cn } from "@/lib/utils";
import { useEvent, useARef, useERef } from "@/lib/nostr";
import type { Group } from "@/lib/types";

function Title({
  event,
  className,
}: {
  event: NostrEvent;
  className?: string;
}) {
  const title = event.tags.find((tag) => tag[0] === "title")?.[1];
  return <h3 className={cn("text-lg", className)}>{title}</h3>;
}

function ForkedFrom({
  author,
  id,
  relays,
}: {
  author: string;
  id: string;
  relays: string[];
}) {
  const { data: original } = useEvent({ id, pubkey: author, relays });
  return original ? (
    <div className="flex flex-row gap-1 items-center text-xs text-muted-foreground">
      <BookCopy className="size-3" />
      <span>derived from</span>
      <div className="flex flex-row gap-1">
        <Title
          event={original}
          className="text-xs line-clamp-1 underline decoration-dotted"
        />
        {/*
      <span>─</span>
      <User pubkey={author} classNames={{ wrapper: "gap-1", avatar: "size-3" }} />
      */}
      </div>
    </div>
  ) : null;
}

export function Book({
  event,
  group,
  relays,
  className,
}: {
  event: NostrEvent;
  group?: Group;
  relays: string[];
  className?: string;
}) {
  const { t } = useTranslation();
  const title = event.tags.find((tag) => tag[0] === "title")?.[1];
  const author = event.tags.find((tag) => tag[0] === "author")?.[1];
  const summary = event.tags.find((tag) => tag[0] === "summary")?.[1];
  const op = event.tags.find((tag) => tag[0] === "p")?.[1];
  const original = event.tags.find((tag) => tag[0] === "E")?.[1];
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex flex-col gap-0">
        <h3 className="text-lg">{title}</h3>
        <span className="text-sm text-muted-foreground">
          {t("book.by", { author })}
        </span>
      </div>
      {op && original ? (
        <ForkedFrom author={op} id={original} relays={relays} />
      ) : null}
      {summary ? (
        <RichText
          tags={event.tags}
          group={group}
          className="text-sm line-clamp-6"
        >
          {summary}
        </RichText>
      ) : null}
      <Hashtags event={event} />
    </div>
  );
}

export function BookDetails({
  event,
  relays,
  className,
}: {
  event: NostrEvent;
  relays: string[];
  className?: string;
}) {
  const { t } = useTranslation();
  const title = event.tags.find((tag) => tag[0] === "title")?.[1];
  const author = event.tags.find((tag) => tag[0] === "author")?.[1];
  const op = event.tags.find((tag) => tag[0] === "p")?.[1];
  const original = event.tags.find((tag) => tag[0] === "E")?.[1];
  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="flex flex-row items-center justify-between">
        <div className="flex flex-col">
          <h3 className="text-lg">{title}</h3>
          <span className="text-sm text-muted-foreground">
            {t("book.by", { author })}
          </span>
        </div>
        <BookIcon className="size-4 text-muted-foreground" />
      </div>
      {op && original ? (
        <ForkedFrom author={op} id={original} relays={relays} />
      ) : null}
      <Hashtags event={event} />
    </div>
  );
}

function TableOfContentsItemA({ tag }: { tag: string[] }) {
  const { data: event } = useARef(tag);
  const [, address] = tag;

  if (!event) return null;

  // todo: on-click
  if (address.startsWith(`${BOOK_CONTENT}`)) {
    const title = event.tags.find((t) => t[0] === "title")?.[1];
    return <li className="toc-item underline decoration-dotted">{title}</li>;
  }

  if (address.startsWith(`${BOOK}`)) {
    return <TableOfContents event={event} />;
  }

  return null;
}

function TableOfContentsItemE({ tag }: { tag: string[] }) {
  const { data: event } = useERef(tag);

  if (!event) return null;

  if (event.kind === BOOK_CONTENT) {
    const title = event.tags.find((t) => t[0] === "title")?.[1];
    return <li className="toc-item">{title}</li>;
  }

  if (event.kind === BOOK) {
    return <TableOfContents event={event} className="ml-2" />;
  }

  return null;
}

function TableOfContentsItem({ tag }: { tag: string[] }) {
  const [t] = tag;
  if (t === "a") {
    return <TableOfContentsItemA tag={tag} />;
  } else {
    return <TableOfContentsItemE tag={tag} />;
  }
}

function TableOfContents({
  event,
  className,
}: {
  event: NostrEvent;
  className?: string;
}) {
  const tags = event.tags.filter((t) => t[0] === "a" || t[0] === "e");
  return (
    <ol className={cn("toc ml-5 text-sm", className)}>
      {tags.map((tag, idx) => (
        <TableOfContentsItem key={idx} tag={tag} />
      ))}
    </ol>
  );
}

const LazyBookContent = React.lazy(
  () => import("@/components/nostr/books/content"),
);

export const BookContent = ({
  event,
  relays,
  className,
}: {
  event: NostrEvent;
  relays: string[];
  className?: string;
}) => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LazyBookContent event={event} className={className} relays={relays} />
    </Suspense>
  );
};

import type { NostrEvent } from "nostr-tools";
import {
  RichText,
  RichTextOptions,
  RichTextClassnames,
} from "@/components/rich-text";
import type { Group } from "@/lib/types";
import { E } from "./event";

export function Post({
  event,
  group,
  className,
  classNames,
  options = {},
}: {
  event: NostrEvent;
  group?: Group;
  className?: string;
  options?: RichTextOptions;
  classNames?: RichTextClassnames;
}) {
  const subject = event.tags.find((t) => t[0] === "subject")?.[1];
  return (
    <>
      {subject ? <h3 className="text-lg font-semibold">{subject}</h3> : null}
      <RichText
        tags={event.tags}
        group={group}
        className={className}
        classNames={classNames}
        options={options}
      >
        {event.content}
      </RichText>
    </>
  );
}

export function PostDetail({
  event,
  group,
  className,
  classNames,
  options = {},
}: {
  event: NostrEvent;
  group?: Group;
  className?: string;
  options?: RichTextOptions;
  classNames?: RichTextClassnames;
}) {
  const subject = event.tags.find((t) => t[0] === "subject")?.[1];
  const legacyReplyTo = event.tags.find(
    (t) => t[0] === "e" && t[3] === "reply",
  )?.[1];
  const legacyReplyRoot = event.tags.find(
    (t) => t[0] === "e" && t[3] === "root",
  )?.[1];
  const replyTo = legacyReplyTo || legacyReplyRoot;
  return (
    <>
      {subject ? <h3 className="text-lg font-semibold">{subject}</h3> : null}
      {replyTo ? (
        <div className="p-0 rounded-md bg-accent">
          <E id={replyTo} asReply asLink className="w-full" />
        </div>
      ) : null}
      <RichText
        tags={event.tags}
        group={group}
        className={className}
        classNames={classNames}
        options={options}
      >
        {event.content}
      </RichText>
    </>
  );
}

import type { NostrEvent } from "nostr-tools";
import {
  RichText,
  RichTextOptions,
  RichTextClassnames,
} from "@/components/rich-text";
import { NameList } from "@/components/nostr/name-list";
import { useReplies } from "@/lib/nostr/comments";
import type { Group } from "@/lib/types";

export function Post({
  event,
  group,
  className,
  classNames,
  options = {},
}: {
  event: NostrEvent;
  group: Group;
  className?: string;
  options?: RichTextOptions;
  classNames?: RichTextClassnames;
}) {
  return (
    <RichText
      tags={event.tags}
      group={group}
      className={className}
      classNames={classNames}
      options={options}
    >
      {event.content}
    </RichText>
  );
}

export function PostWithReplies({
  event,
  group,
  className,
  classNames,
  options = {},
}: {
  event: NostrEvent;
  group: Group;
  className?: string;
  classNames?: RichTextClassnames;
  options?: RichTextOptions;
}) {
  const { events: replies } = useReplies(event, group);
  return (
    <>
      <RichText
        tags={event.tags}
        group={group}
        className={className}
        classNames={classNames}
        options={options}
      >
        {event.content}
      </RichText>
      {replies?.length > 0 ? (
        <div>
          <span className="text-xs text-muted-foreground">
            <NameList pubkeys={replies.map((r) => r.pubkey)} suffix="replied" />
          </span>
        </div>
      ) : null}
    </>
  );
}

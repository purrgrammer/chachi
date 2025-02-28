import type { NostrEvent } from "nostr-tools";
import { NDKKind } from "@nostr-dev-kit/ndk";
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

export function PostWithReplies({
  event,
  group,
  className,
  classNames,
  options = {},
}: {
  event: NostrEvent;
  group?: Group;
  className?: string;
  classNames?: RichTextClassnames;
  options?: RichTextOptions;
}) {
  const { events: replies } = useReplies(event, group);
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
      {replies?.length > 0 ? (
        <div>
          <span className="text-xs text-muted-foreground">
            <NameList
              pubkeys={replies
                .filter((r) => r.kind !== NDKKind.Zap)
                .map((r) => r.pubkey)}
              suffix="replied"
            />
          </span>
        </div>
      ) : null}
    </>
  );
}

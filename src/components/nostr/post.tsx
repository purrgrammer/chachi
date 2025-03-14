import type { NostrEvent } from "nostr-tools";
import {
  RichText,
  RichTextOptions,
  RichTextClassnames,
} from "@/components/rich-text";
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

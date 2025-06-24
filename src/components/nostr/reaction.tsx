import { NostrEvent } from "nostr-tools";
import { Event } from "@/components/nostr/event";
import type { Group } from "@/lib/types";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CUSTOM_EMOJI_CONTENT_REGEX } from "@/lib/emoji";

export default function Reaction({
  event,
  group,
}: {
  event: NostrEvent;
  group?: Group;
}) {
  const eventId = event.tags.find((t) => t[0] === "e")?.[1];
  const pubkey = event.tags.find((t) => t[0] === "p")?.[1];
  const content = event.content.trim();
  const isCustomEmoji = CUSTOM_EMOJI_CONTENT_REGEX.test(content);
  const emojiName = content.slice(1, -1);
  const emojiImage = event.tags.find(
    (t) => t[0] === "emoji" && t[1] === emojiName,
  )?.[2];
  return (
    <div className="flex flex-row items-start justify-between gap-4">
      {isCustomEmoji ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="size-10 place-content-center">
              <img className="size-10" src={emojiImage} alt={content} />
            </div>
          </TooltipTrigger>
          <TooltipContent>{emojiName}</TooltipContent>
        </Tooltip>
      ) : (
        <span className="text-4xl line-clamp-1 flex-shrink-0">
          {content === "+"
            ? "👍"
            : content === "-"
              ? "👎"
              : content
                ? content
                : "👍"}
        </span>
      )}
      {eventId ? (
        <Event
          id={eventId}
          relays={[]}
          group={group}
          pubkey={pubkey}
          showReactions={false}
        />
      ) : null}
    </div>
  );
}

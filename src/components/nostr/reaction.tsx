import { NostrEvent } from "nostr-tools";
import { User } from "@/components/nostr/user";
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
  group: Group;
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
    <div className="flex flex-col gap-1.5 pt-1">
      <div className="flex flex-row items-center gap-2">
        <User pubkey={event.pubkey} classNames={{ avatar: "size-5" }} />
        {isCustomEmoji ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="w-5 h-5 place-content-center">
                <img className="w-5 h-5" src={emojiImage} alt={content} />
              </div>
            </TooltipTrigger>
            <TooltipContent>{emojiName}</TooltipContent>
          </Tooltip>
        ) : (
          <span className="text-md">{content}</span>
        )}
      </div>
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

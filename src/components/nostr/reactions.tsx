import { useState } from "react";
import { NostrEvent } from "nostr-tools";
import { Avatar } from "@/components/nostr/avatar";
import { Button } from "@/components/ui/button";
import { useReactions } from "@/lib/nostr";
import { usePubkey } from "@/lib/account";
import { cn, groupBy } from "@/lib/utils";
import { CUSTOM_EMOJI_CONTENT_REGEX } from "@/lib/emoji";
import { useTranslation } from "react-i18next";
import * as Kind from "@/lib/nostr/kinds";
import {
  usePublishReaction,
  usePublishEvent,
  buildCustomEmojiReaction,
} from "@/lib/nostr/publishing";

function Reacters({
  reactions,
  isCompact,
}: {
  reactions: NostrEvent[];
  isCompact: boolean;
}) {
  const { deduped } = reactions.reduce(
    (acc, r) => {
      const id = `${r.pubkey}${r.content}`;
      if (acc.seen.has(id)) return acc;
      acc.seen.add(id);
      acc.deduped.push(r);
      return acc;
    },
    { deduped: [] as NostrEvent[], seen: new Set<string>() },
  );
  const zIndexes = ["z-40", "z-30", "z-20", "z-10"];
  return (
    <>
      {deduped.length > 3 || isCompact ? (
        <span className="text-muted-foreground text-sm">{deduped.length}</span>
      ) : (
        <div className="flex flex-row">
          {deduped.map((r, idx) => (
            <Avatar
              key={r.id}
              pubkey={r.pubkey}
              className={`size-4 ${idx > 0 && deduped.length > 1 ? "-ml-1" : ""} ${zIndexes[idx]}`}
            />
          ))}
        </div>
      )}
    </>
  );
}

function Reaction({
  event,
  relays,
  content,
  reactions,
  isCompact,
}: {
  event: NostrEvent;
  relays: string[];
  content: string;
  reactions: NostrEvent[];
  isCompact: boolean;
}) {
  const [isReacting, setIsReacting] = useState(false);
  const publishReaction = usePublishReaction();
  const publish = usePublishEvent();
  const isCustomEmoji = CUSTOM_EMOJI_CONTENT_REGEX.test(content);
  const emojiName = content.slice(1, -1);
  const emojiTag = reactions[0].tags.find(
    (t) => t[0] === "emoji" && t[1] === emojiName,
  );
  const emojiImage = emojiTag?.[2];
  const emojiAddress = emojiTag?.[3];
  const me = usePubkey();
  const iReacted = reactions.some((r) => r.pubkey === me);
  const { t } = useTranslation();

  async function react(content: string) {
    try {
      setIsReacting(true);
      await publishReaction(event, content, relays);
    } catch (err) {
      console.error(err);
    } finally {
      setIsReacting(false);
    }
  }

  async function reactCustomEmoji(
    emoji: string,
    img: string,
    address?: string,
  ) {
    try {
      setIsReacting(true);
      const relay = relays[0];
      const template = buildCustomEmojiReaction(emoji, img, event, address, relay);
      await publish(template, relays);
    } catch (err) {
      console.error(err);
    } finally {
      setIsReacting(false);
    }
  }

  return (
    <Button
      disabled={isReacting || iReacted || event.pubkey === me}
      variant="reaction"
      size="fit"
      className={iReacted ? "ring ring-primary ring-1 ring-offset-0" : ""}
      onClick={() =>
        isCustomEmoji && emojiName && emojiImage
          ? reactCustomEmoji(emojiName, emojiImage, emojiAddress)
          : react(content)
      }
      aria-label={`${t("chat.message.react.with")}${content}`}
    >
      <div className="flex flex-row items-center gap-1.5">
        {isCustomEmoji ? (
          <div className="w-5 h-5 place-content-center">
            <img className="w-5 h-5" src={emojiImage} alt={content} />
          </div>
        ) : (
          <div className="w-5 h-5 place-content-center">
            <span className="text-md">{content}</span>
          </div>
        )}
        <Reacters isCompact={isCompact} reactions={reactions} />
      </div>
    </Button>
  );
}

function getOldestReaction(reactions: NostrEvent[]): NostrEvent | null {
  return reactions.reduce(
    (oldest, r) => {
      if (!oldest) return r;
      return r.created_at < (oldest.created_at ?? 0) ? r : oldest;
    },
    null as NostrEvent | null,
  );
}

export function ReactionsList({
  event,
  events,
  relays,
  className,
}: {
  event: NostrEvent;
  events: NostrEvent[];
  relays?: string[];
  className?: string;
}) {
  const reactions = events.filter((r) => r.kind === Kind.Reaction);
  const hasReactions = reactions.length > 0;

  const byContent = groupBy(reactions, (r: NostrEvent) => {
    return r.content === "+" ? "👍" : r.content === "-" ? "👎" : r.content;
  });
  const isCompact = Object.keys(byContent).length > 5;

  return hasReactions ? (
    <div
      className={cn(
        `flex flex-row gap-1.5 ${reactions.length > 0 ? "p-0.5 pt-1" : ""} w-full overflow-x-auto no-scrollbar`,
        className,
      )}
    >
      {Object.entries(byContent)
        .sort((a, b) => {
          return (
            (getOldestReaction(a[1] as NostrEvent[])?.created_at ?? 0) -
            (getOldestReaction(b[1] as NostrEvent[])?.created_at ?? 0)
          );
        })
        .map(([content, reactions], idx) => (
          <Reaction
            key={`reaction-${idx}`}
            event={event}
            relays={relays || []}
            content={content}
            reactions={(reactions as NostrEvent[]).reverse()}
            isCompact={isCompact}
          />
        ))}
    </div>
  ) : null;
}

// todo: configurable sizes, bg
// todo: implement lazy reactions
export function Reactions({
  event,
  relays = [],
  kinds = [Kind.Reaction],
  className,
  live,
}: {
  event: NostrEvent;
  relays?: string[];
  kinds?: number[];
  className?: string;
  live?: boolean;
}) {
  const { events } = useReactions(event, kinds, relays, live);
  return <ReactionsList event={event} events={events} relays={relays} className={className} />;
}


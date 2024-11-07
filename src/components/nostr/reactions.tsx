"use client";

import { useState, useContext } from "react";
import { Bitcoin } from "lucide-react";
import { NDKEvent, NDKKind } from "@nostr-dev-kit/ndk";
import { NostrEvent } from "nostr-tools";
import { Avatar } from "@/components/nostr/avatar";
import { Button } from "@/components/ui/button";
import { useRelaySet, useReactions } from "@/lib/nostr";
import { formatShortNumber } from "@/lib/number";
import { NDKContext } from "@/lib/ndk";
import { useAccount } from "@/lib/account";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { validateZap, Zap } from "@/lib/nip-57";
import { cn, groupBy } from "@/lib/utils";

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

const CUSTOM_EMOJI = /^:[a-zA-Z0-9_-]+:$/;

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
  const ndk = useContext(NDKContext);
  const relaySet = useRelaySet(relays);
  const [isReacting, setIsReacting] = useState(false);
  const isCustomEmoji = CUSTOM_EMOJI.test(content);
  const emojiName = content.slice(1, -1);
  const emojiImage = reactions[0].tags.find(
    (t) => t[0] === "emoji" && t[1] === emojiName,
  )?.[2];
  const account = useAccount();
  const me = account?.pubkey;
  const iReacted = reactions.some((r) => r.pubkey === me);

  async function react(content: string) {
    try {
      setIsReacting(true);
      if (ndk) {
        const e = new NDKEvent(ndk, {
          kind: NDKKind.Reaction,
          content,
        } as NostrEvent);
        e.tag(new NDKEvent(ndk, event));
        await e.publish(relaySet);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsReacting(false);
    }
  }

  async function reactCustomEmoji(emoji: string, img: string) {
    try {
      setIsReacting(true);
      if (ndk) {
        const e = new NDKEvent(ndk, {
          kind: NDKKind.Reaction,
          content: `:${emoji}:`,
          tags: [["emoji", emoji, img]],
        } as NostrEvent);
        e.tag(new NDKEvent(ndk, event));
        await e.publish(relaySet);
      }
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
          ? reactCustomEmoji(emojiName, emojiImage)
          : react(content)
      }
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

function ZapReaction({ zap }: { zap: Zap }) {
  // todo: USD/EUR amounts
  const account = useAccount();
  const me = account?.pubkey;
  const iZapped = zap.pubkey === me;
  return (
    <div
      className={`px-1.5 py-1 text-foreground bg-background/90 dark:bg-background/30 rounded-xl ${iZapped ? "bg-primary/20 dark:bg-primary/50" : ""} transition-color`}
    >
      <div className="flex flex-row items-center gap-1.5">
        <Bitcoin className="size-4 text-muted-foreground" />
        <span className="text-sm font-mono">
          {formatShortNumber(zap.amount)}
        </span>
        <Avatar pubkey={zap.pubkey} className="size-4" />
        {zap.content ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-xs line-clamp-1">{zap.content}</span>
            </TooltipTrigger>
            <TooltipContent>{zap.content}</TooltipContent>
          </Tooltip>
        ) : null}
      </div>
    </div>
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

// todo: configurable sizes, bg
// todo: implement lazy reactions
export function Reactions({
  event,
  relays = [],
  kinds = [NDKKind.Reaction],
  className,
  live,
}: {
  event: NostrEvent;
  relays?: string[];
  kinds?: NDKKind[];
  className?: string;
  live?: boolean;
}) {
  const { events } = useReactions(event, kinds, relays, live);

  const zaps = events
    .filter((r) => r.kind === NDKKind.Zap)
    .map(validateZap)
    .filter((z) => z !== null)
    .sort((a, b) => b.amount - a.amount) as Zap[];
  const reactions = events.filter((r) => r.kind === NDKKind.Reaction);
  const hasReactions = zaps.length > 0 || reactions.length > 0;

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
      {zaps.map((zap) => (
        <ZapReaction key={zap.id} zap={zap} />
      ))}
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
            relays={relays}
            content={content}
            reactions={(reactions as NostrEvent[]).reverse()}
            isCompact={isCompact}
          />
        ))}
    </div>
  ) : null;
}

export function Zaps({
  event,
  relays,
  className,
  live,
}: {
  event: NostrEvent;
  relays?: string[];
  className?: string;
  live?: boolean;
}) {
  return (
    <Reactions
      event={event}
      kinds={[NDKKind.Zap]}
      relays={relays}
      className={className}
      live={live}
    />
  );
}

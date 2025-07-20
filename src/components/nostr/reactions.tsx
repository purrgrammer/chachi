import { useState } from "react";
import { NDKRelaySet, NDKEvent, NDKKind } from "@nostr-dev-kit/ndk";
import { NostrEvent } from "nostr-tools";
import { Avatar } from "@/components/nostr/avatar";
import { RichText } from "@/components/rich-text";
import { Button } from "@/components/ui/button";
import { useReactions } from "@/lib/nostr";
import { useNDK } from "@/lib/ndk";
import { usePubkey } from "@/lib/account";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { validateZap, Zap } from "@/lib/nip-57";
import { validateNutzap, Nutzap } from "@/lib/nip-61";
import { cn, groupBy } from "@/lib/utils";
import { CUSTOM_EMOJI_CONTENT_REGEX } from "@/lib/emoji";
import { HUGE_AMOUNT } from "@/lib/zap";
import { useMintList } from "@/lib/cashu";
import { useTranslation } from "react-i18next";
import Amount from "@/components/amount";

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
  const ndk = useNDK();
  const [isReacting, setIsReacting] = useState(false);
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
      const relaySet = NDKRelaySet.fromRelayUrls(relays, ndk);
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

  async function reactCustomEmoji(
    emoji: string,
    img: string,
    address?: string,
  ) {
    try {
      setIsReacting(true);
      if (ndk) {
        const relaySet = NDKRelaySet.fromRelayUrls(relays, ndk);
        const emojiTag = address
          ? ["emoji", emoji, img, address]
          : ["emoji", emoji, img];
        const e = new NDKEvent(ndk, {
          kind: NDKKind.Reaction,
          content: `:${emoji}:`,
          tags: [emojiTag],
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

function NutzapReaction({ nutzap }: { nutzap: Nutzap }) {
  // todo: USD/EUR amounts
  return (
    <div
      className={`p-1 text-foreground transition-color ${nutzap.amount >= HUGE_AMOUNT ? "bg-animated-gradient" : "bg-gradient"} rounded-xl`}
    >
      <div className="flex flex-row items-center gap-1.5">
        {nutzap.content ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <RichText
                className="max-w-16 text-xs break-all line-clamp-1"
                options={{
                  inline: true,
                  events: false,
                  ecash: false,
                  video: false,
                  images: false,
                  audio: false,
                }}
                tags={nutzap.tags}
              >
                {nutzap.content.trim()}
              </RichText>
            </TooltipTrigger>
            <TooltipContent>
              <RichText
                className="text-xs break-all"
                options={{
                  inline: true,
                  events: false,
                  ecash: false,
                  video: false,
                  images: false,
                  audio: false,
                }}
                tags={nutzap.tags}
              >
                {nutzap.content.trim()}
              </RichText>
            </TooltipContent>
          </Tooltip>
        ) : null}
        <Amount amount={nutzap.amount} size="sm" />
        <Avatar pubkey={nutzap.pubkey} className="size-4" />
      </div>
    </div>
  );
}

function ZapReaction({ zap }: { zap: Zap }) {
  const me = usePubkey();
  const iZapped = zap.pubkey === me;
  return (
    <div
      className={`p-1 text-foreground bg-background/90 dark:bg-background/30 rounded-xl ${iZapped ? "bg-primary/20 dark:bg-primary/50" : ""} transition-color`}
    >
      <div className="flex flex-row items-center gap-1.5">
        {zap.content ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <RichText
                className="text-xs line-clamp-1"
                tags={zap.tags}
                options={{
                  inline: true,
                  events: false,
                  ecash: false,
                  video: false,
                  images: false,
                  audio: false,
                }}
              >
                {zap.content.trim()}
              </RichText>
            </TooltipTrigger>
            <TooltipContent>
              <RichText
                className="text-xs"
                tags={zap.tags}
                options={{
                  inline: true,
                  events: false,
                  ecash: false,
                  video: false,
                  images: false,
                  audio: false,
                }}
              >
                {zap.content.trim()}
              </RichText>
            </TooltipContent>
          </Tooltip>
        ) : null}
        <Amount amount={zap.amount} size="sm" />
        <Avatar pubkey={zap.pubkey} className="size-4" />
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
  const zaps = events
    .filter((r) => r.kind === NDKKind.Zap)
    .map(validateZap)
    .filter((z) => z !== null)
    .sort((a, b) => b.amount - a.amount) as Zap[];
  const nutzaps = events
    .filter((r) => r.kind === NDKKind.Nutzap)
    .map(validateNutzap)
    .filter((z) => z !== null)
    .sort((a, b) => b.amount - a.amount) as Nutzap[];
  const reactions = events.filter((r) => r.kind === NDKKind.Reaction);
  const hasReactions =
    zaps.length > 0 || reactions.length > 0 || nutzaps.length > 0;

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
      {nutzaps.map((zap) => (
        <NutzapReaction key={zap.id} nutzap={zap} />
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
  return <ReactionsList event={event} events={events} className={className} />;
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
      kinds={[NDKKind.Zap, NDKKind.Nutzap]}
      relays={relays}
      className={className}
      live={live}
    />
  );
}

export function Nutzaps({
  event,
  className,
  live,
}: {
  event: NostrEvent;
  className?: string;
  live?: boolean;
}) {
  const { data: mintList } = useMintList(event.pubkey);
  return mintList ? (
    <Reactions
      event={event}
      kinds={[NDKKind.Nutzap]}
      relays={mintList.relays}
      className={className}
      live={live}
    />
  ) : null;
}

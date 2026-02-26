import { NostrEvent } from "nostr-tools";
import Amount from "@/components/amount";
import { A, E } from "@/components/nostr/event";
import {
  useRichText,
  RichText,
  BlockFragment,
  EmojiFragment,
} from "@/components/rich-text";
import { Emoji } from "@/components/emoji";
import { User } from "@/components/nostr/user";
import { validateZap, Zap as ZapType } from "@/lib/nip-57";
import {
  HUGE_AMOUNT,
} from "@/lib/zap";
import type { Group } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ZapReply({
  event,
  group,
}: {
  event: NostrEvent;
  group?: Group;
}) {
  const zap = validateZap(event);
  return zap ? (
    <Zap
      zap={zap}
      group={group}
      animateGradient={false}
      showRef={false}
      showTarget={false}
    />
  ) : (
    <span>Invalid zap</span>
  );
}

export function ZapDetail({
  event,
  group,
}: {
  event: NostrEvent;
  group?: Group;
}) {
  const zap = validateZap(event);
  return zap ? (
    <Zap zap={zap} group={group} animateGradient={false} />
  ) : (
    <span>Invalid zap</span>
  );
}

export function ZapPreview({
  event,
  group,
}: {
  event: NostrEvent;
  group?: Group;
}) {
  const zap = validateZap(event);
  return zap ? <Zap zap={zap} group={group} animateGradient={false} /> : null;
}

export function Zap({
  zap,
  className,
  group,
  animateGradient,
  showAuthor = true,
  onReplyClick,
  classNames,
  showRef = true,
  showTarget = true,
}: {
  zap: ZapType;
  className?: string;
  group?: Group;
  animateGradient?: boolean;
  showAuthor?: boolean;
  onReplyClick?: (ev: NostrEvent) => void;
  classNames?: {
    singleCustomEmoji?: string;
    onlyEmojis?: string;
  };
  showRef?: boolean;
  showTarget?: boolean;
}) {
  const pubkey = usePubkey();
  const fragments = useRichText(
    zap.content.trim(),
    {
      emojis: true,
    },
    zap.tags,
  );
  const isSingleCustomEmoji =
    fragments.length === 1 &&
    fragments[0].type === "block" &&
    fragments[0].nodes.length === 1 &&
    fragments[0].nodes[0].type === "emoji";
  const singleCustomEmoji = isSingleCustomEmoji
    ? ((fragments[0] as BlockFragment).nodes[0] as EmojiFragment)
    : null;
  const isOnlyEmojis =
    /^\p{Emoji_Presentation}{1}\s*\p{Emoji_Presentation}{0,4}$/u.test(
      zap.content.trim(),
    );
  const content =
    isSingleCustomEmoji && singleCustomEmoji ? (
      <div
        className={zap.pubkey === pubkey ? "flex items-end justify-end" : ""}
      >
        <Emoji
          key={singleCustomEmoji.name}
          name={singleCustomEmoji.name}
          image={singleCustomEmoji.image}
          address={singleCustomEmoji.address}
          className={cn(
            `w-32 h-32 aspect-auto rounded-md`,
            classNames?.singleCustomEmoji,
          )}
        />
      </div>
    ) : isOnlyEmojis ? (
      <span className={cn("text-7xl", classNames?.onlyEmojis)}>
        {zap.content.trim()}
      </span>
    ) : (
      <RichText tags={zap.tags} options={{ syntax: true }}>
        {zap.content.trim()}
      </RichText>
    );
  // todo: emoji, single custom emoji
  return (
    <div
      className={cn(
        `flex flex-col gap-1 ${animateGradient ? "rounded-md border-gradient" : ""} ${animateGradient && zap.amount >= HUGE_AMOUNT ? "border-animated-gradient" : ""}`,
        className,
      )}
    >
      <div className="flex flex-row gap-3 justify-between">
        {showAuthor ? (
          <User pubkey={zap.pubkey} classNames={{ avatar: "size-4" }} />
        ) : null}
        <div className="flex items-center">
          <Amount amount={zap.amount} size="md" showIcon={true} />
        </div>
        {showTarget && zap.p ? (
          <User
            pubkey={zap.p}
            classNames={{ avatar: "size-4", name: "font-normal" }}
          />
        ) : null}
      </div>
      {showRef && zap.e ? (
        <E
          id={zap.e}
          group={group}
          pubkey={zap.p}
          relays={group ? [group.relay] : []}
          showReactions={false}
          asReply
          onClick={onReplyClick}
        />
      ) : showRef && zap.a && !zap.a.startsWith("39000") ? (
        <A
          address={zap.a}
          group={group}
          showReactions={false}
          asReply
          relays={group ? [group.relay] : []}
          onClick={onReplyClick}
        />
      ) : null}
      {zap.content.trim().length > 0 ? content : null}
    </div>
  );
}

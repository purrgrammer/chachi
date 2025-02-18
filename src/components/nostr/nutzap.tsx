import { validateNutzap, Nutzap as NutzapType } from "@/lib/nip-61";
import { Bitcoin, Euro, DollarSign, Banknote } from "lucide-react";
import { NostrEvent } from "nostr-tools";
import { E, A } from "@/components/nostr/event";
import { formatShortNumber } from "@/lib/number";
import { Pubkey } from "@/components/nostr/pubkey";
import { MintLink } from "@/components/mint";
import { Emoji } from "@/components/emoji";
import {
  useRichText,
  RichText,
  BlockFragment,
  EmojiFragment,
} from "@/components/rich-text";
import { User } from "@/components/nostr/user";
import { HUGE_AMOUNT } from "@/lib/zap";
import { usePubkey } from "@/lib/account";
import { Group } from "@/lib/types";
import { cn } from "@/lib/utils";

export function NutzapDetail({
  event,
  group,
}: {
  event: NostrEvent;
  group?: Group;
}) {
  return <Nutzap event={event} group={group} animateGradient={false} />;
}

export function NutzapPreview({
  event,
  group,
}: {
  event: NostrEvent;
  group?: Group;
}) {
  return <Nutzap event={event} group={group} animateGradient={true} />;
}

export function NutzapContent({
  event,
  group,
  zap,
  classNames,
}: {
  event: NostrEvent;
  group?: Group;
  zap: NutzapType;
  classNames?: {
    singleCustomEmoji?: string;
    onlyEmojis?: string;
  };
}) {
  const fragments = useRichText(
    event.content.trim(),
    {
      emojis: true,
    },
    event.tags,
  );
  const pubkey = usePubkey();
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
      event.content.trim(),
    );
  return isSingleCustomEmoji && singleCustomEmoji ? (
    <div
      className={event.pubkey === pubkey ? "flex items-end justify-end" : ""}
    >
      <Emoji
        key={singleCustomEmoji.name}
        name={singleCustomEmoji.name}
        image={singleCustomEmoji.image}
        className={cn(
          `w-32 h-32 aspect-auto rounded-md`,
          classNames?.singleCustomEmoji,
        )}
      />
    </div>
  ) : isOnlyEmojis ? (
    <span className={cn("text-7xl", classNames?.onlyEmojis)}>
      {event.content.trim()}
    </span>
  ) : (
    <RichText tags={event.tags.concat(zap.tags)} group={group}>
      {zap.content}
    </RichText>
  );
}

export function Nutzap({
  event,
  group,
  animateGradient,
  showAuthor = true,
}: {
  event: NostrEvent;
  group?: Group;
  animateGradient?: boolean;
  showAuthor?: boolean;
}) {
  const zap = validateNutzap(event);
  return zap ? (
    <div
      className={`flex flex-col gap-2 ${animateGradient ? "rounded-md border-gradient" : ""} ${animateGradient && zap.amount >= HUGE_AMOUNT ? "border-animated-gradient" : ""}`}
    >
      <div className="flex flex-row gap-10 justify-between">
        {showAuthor ? (
          <User pubkey={zap.pubkey} classNames={{ avatar: "size-4" }} />
        ) : null}
        <div className="flex items-center">
          <span className="text-muted-foreground">
            {zap.unit === "sat" ? (
              <Bitcoin className="size-6" />
            ) : zap.unit === "eur" ? (
              <Euro className="size-6" />
            ) : zap.unit === "usd" ? (
              <DollarSign className="size-6" />
            ) : (
              <Banknote className="size-6" />
            )}
          </span>
          <span className="font-mono text-2xl">
            {formatShortNumber(zap.amount)}
          </span>
        </div>
        {zap.p ? (
          <User
            pubkey={zap.p}
            classNames={{ avatar: "size-5", name: "text-md" }}
          />
        ) : null}
      </div>
      {zap.e ? (
        <E id={zap.e} group={group} pubkey={zap.p} showReactions={false} />
      ) : zap.a ? (
        <A address={zap.a} group={group} showReactions={false} />
      ) : null}
      <NutzapContent event={event} zap={zap} />
      {zap.p2pk ? <Pubkey isCashu pubkey={zap.p2pk} /> : null}
      {zap.mint ? (
        <MintLink
          includeLandmark
          url={zap.mint}
          classNames={{ icon: "size-3", name: "text-xs" }}
        />
      ) : null}
    </div>
  ) : (
    <span className="text-xs text-muted-foreground">Invalid zap</span>
  );
}

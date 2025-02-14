import { validateNutzap, Nutzap as NutzapType } from "@/lib/nip-61";
import { Link } from "react-router-dom";
import { Landmark, Bitcoin, Euro, DollarSign } from "lucide-react";
import { NostrEvent } from "nostr-tools";
import { E, A } from "@/components/nostr/event";
import { formatShortNumber } from "@/lib/number";
import { MintName, MintIcon } from "@/components/mint";
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

function NutzapContent({
  event,
  group,
  zap,
}: {
  event: NostrEvent;
  group?: Group;
  zap: NutzapType;
}) {
  const fragments = useRichText(
    event.content.trim(),
    {
      events: true,
      images: true,
      video: true,
      audio: true,
      emojis: true,
      urls: true,
      ecash: true,
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
  return isSingleCustomEmoji && singleCustomEmoji ? (
    <div
      className={event.pubkey === pubkey ? "flex items-end justify-end" : ""}
    >
      <Emoji
        key={singleCustomEmoji.name}
        name={singleCustomEmoji.name}
        image={singleCustomEmoji.image}
        className={`w-32 h-32 aspect-auto rounded-md`}
      />
    </div>
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
              <Bitcoin className="size-4" />
            ) : zap.unit === "eur" ? (
              <Euro className="size-4" />
            ) : zap.unit === "usd" ? (
              <DollarSign className="size-4" />
            ) : null}
          </span>
          <span className="font-mono text-lg">
            {formatShortNumber(zap.amount)}
          </span>
        </div>
        {zap.p ? (
          <User pubkey={zap.p} classNames={{ avatar: "size-4" }} />
        ) : null}
      </div>
      {zap.e ? (
        <E id={zap.e} group={group} pubkey={zap.p} />
      ) : zap.a ? (
        <A address={zap.a} group={group} />
      ) : null}
      <NutzapContent event={event} zap={zap} />
      {zap.mint ? (
        <div className="flex flex-row gap-1 items-center justify-end">
          <Landmark className="size-3" />
          <MintIcon url={zap.mint} className="size-3" />
          <Link
            to={`/mint/${zap.mint.replace(/^https:\/\//, "")}`}
            className="leading-tight"
          >
            <MintName
              url={zap.mint}
              className="text-xs hover:underline hover:decoration-dotted"
            />
          </Link>
        </div>
      ) : null}
    </div>
  ) : (
    <span className="text-xs text-muted-foreground">Invalid zap</span>
  );
}

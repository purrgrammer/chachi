import { validateNutzap } from "@/lib/nip-61";
import { Link } from "react-router-dom";
import { Landmark, Bitcoin, Euro, DollarSign } from "lucide-react";
import { NostrEvent } from "nostr-tools";
import { Event, Address } from "@/components/nostr/event";
import { formatShortNumber } from "@/lib/number";
import { MintName, MintIcon } from "@/components/mint";
import { RichText } from "@/components/rich-text";
import { User } from "@/components/nostr/user";
import { HUGE_AMOUNT } from "@/lib/zap";
import { Group } from "@/lib/types";

function E({
  id,
  group,
  pubkey,
}: {
  id: string;
  pubkey?: string;
  group?: Group;
}) {
  return (
    <Event
      id={id}
      group={group}
      pubkey={pubkey}
      relays={[]}
      showReactions={false}
    />
  );
}

function A({ address, group }: { address: string; group?: Group }) {
  const [k, pubkey, d] = address.split(":");
  return (
    <Address
      kind={Number(k)}
      pubkey={pubkey}
      identifier={d}
      group={group}
      relays={[]}
      showReactions={false}
    />
  );
}

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
      <RichText tags={event.tags.concat(zap.tags)} group={group}>
        {zap.content}
      </RichText>
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

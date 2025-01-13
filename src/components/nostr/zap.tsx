import { NostrEvent } from "nostr-tools";
import { Bitcoin } from "lucide-react";
import { RichText } from "@/components/rich-text";
import { validateZap } from "@/lib/nip-57";
import { Name } from "@/components/nostr/name";
import { Avatar } from "@/components/nostr/Avatar";
import { formatShortNumber } from "@/lib/number";
import { Event, Address } from "@/components/nostr/event";
import type { Group } from "@/lib/types";

function User({ pubkey }: { pubkey: string }) {
  return (
    <div className="flex flex-row gap-1 items-center">
      <Avatar pubkey={pubkey} className="size-4" />
      <span>
        <Name pubkey={pubkey} />
      </span>
    </div>
  );
}

function E({ id, group }: { id: string; group: Group }) {
  return (
    <Event
      id={id}
      relays={["wss://nos.lol"]}
      group={group}
      showReactions={false}
    />
  );
}

function A({ address, group }: { address: string; group: Group }) {
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

const HUGE_ZAP = 20_000;

export function ZapDetail({
  event,
  group,
}: {
  event: NostrEvent;
  group: Group;
}) {
  return <Zap event={event} group={group} animateGradient={false} />;
}

export function ZapPreview({
  event,
  group,
}: {
  event: NostrEvent;
  group: Group;
}) {
  return <Zap event={event} group={group} animateGradient={true} />;
}

export function Zap({
  event,
  group,
  animateGradient,
}: {
  event: NostrEvent;
  group: Group;
  animateGradient?: boolean;
}) {
  const zap = validateZap(event);
  return zap ? (
    <div
      className={`flex flex-col gap-2 ${animateGradient ? "rounded-md border-gradient" : ""} ${animateGradient && zap.amount >= HUGE_ZAP ? "border-animated-gradient" : ""}`}
    >
      <div className="flex flex-row gap-8 relative justify-between">
        <User pubkey={zap.pubkey} />
        <div className="flex items-center">
          <span className="font-mono text-lg">
            {formatShortNumber(zap.amount)}
          </span>
          <span className="text-muted-foreground">
            <Bitcoin className="size-4" />
          </span>
        </div>
        {zap.p ? <User pubkey={zap.p} /> : null}
      </div>
      <RichText tags={event.tags} group={group}>
        {zap.content}
      </RichText>
      {zap.e ? (
        <E id={zap.e} group={group} />
      ) : zap.a ? (
        <A address={zap.a} group={group} />
      ) : null}
    </div>
  ) : (
    <span className="text-xs text-muted-foreground">Invalid zap</span>
  );
}

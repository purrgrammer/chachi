import { NostrEvent } from "nostr-tools";
import { Bitcoin } from "lucide-react";
import { RichText } from "@/components/rich-text";
//import { AutocompleteTextarea } from "@/components/autocomplete-textarea";
import { Group } from "@/lib/types";
import { User } from "@/components/nostr/user";
import { Event, Address } from "@/components/nostr/event";
import { validateZap, Zap as ZapType } from "@/lib/nip-57";
import { formatShortNumber } from "@/lib/number";
import { HUGE_AMOUNT } from "@/lib/zap";

function E({
  id,
  group,
  pubkey,
}: {
  id: string;
  pubkey?: string;
  group: Group;
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

export function ZapDetail({
  event,
  group,
}: {
  event: NostrEvent;
  group: Group;
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
  group: Group;
}) {
  const zap = validateZap(event);
  return zap ? (
    <Zap zap={zap} group={group} animateGradient={false} />
  ) : (
    <span>Invalid zap</span>
  );
}

export function Zap({
  zap,
  group,
  animateGradient,
  embedMention = true,
}: {
  zap: ZapType;
  group: Group;
  animateGradient?: boolean;
  embedMention?: boolean;
}) {
  return (
    <div
      className={`flex flex-col gap-2 ${animateGradient ? "rounded-md border-gradient" : ""} ${animateGradient && zap.amount >= HUGE_AMOUNT ? "border-animated-gradient" : ""}`}
    >
      <div className="flex flex-row gap-3 justify-between">
        <User pubkey={zap.pubkey} classNames={{ avatar: "size-4" }} />
        <div className="flex items-center">
          <span className="font-mono text-lg">
            {formatShortNumber(zap.amount)}
          </span>
          <span className="text-muted-foreground">
            <Bitcoin className="size-4" />
          </span>
        </div>
        {zap.p ? (
          <User pubkey={zap.p} classNames={{ avatar: "size-4" }} />
        ) : null}
      </div>
      {zap.content.trim().length > 0 ? (
        <RichText tags={zap.tags} group={group}>
          {zap.content}
        </RichText>
      ) : null}
      {zap.e && embedMention ? (
        <E id={zap.e} group={group} pubkey={zap.p} />
      ) : zap.a && embedMention ? (
        <A address={zap.a} group={group} />
      ) : null}
    </div>
  );
}

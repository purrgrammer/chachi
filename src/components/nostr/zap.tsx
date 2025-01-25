import { useState } from "react";
import { NostrEvent } from "nostr-tools";
import { Bitcoin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RichText } from "@/components/rich-text";
import { Embed } from "@/components/nostr/detail";
import { Group } from "@/lib/types";
import { User } from "@/components/nostr/user";
import { Event, Address } from "@/components/nostr/event";
import { validateZap, Zap as ZapType } from "@/lib/nip-57";
import { formatShortNumber } from "@/lib/number";
import { HUGE_AMOUNT } from "@/lib/zap";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerTrigger,
} from "@/components/ui/drawer";

const amounts = [21, 69, 420,
		 2100, 6900, 21000];

export function NewZap({ event, group }: { event: NostrEvent; group: Group }) {
const [isOpen, setIsOpen] = useState(false);
return (
    <Drawer open={isOpen} onOpenChange={setIsOpen}>
      <DrawerTrigger asChild>
        <Button variant="action" size="icon" className="bg-primary rounded-full">
          <Bitcoin />
        </Button>
	</DrawerTrigger>
      <DrawerContent>
        <div className="flex flex-col items-center justify-center py-6">
          <div className="flex flex-col gap-3 sm:max-w-[425px]">
	    <Embed event={event} group={group} className="w-64" />

            <div className="grid grid-cols-3 gap-2">
		    {amounts.map((amount) => (
		    <Button variant="outline" size="big">
                      <div className="flex flex-col items-center gap-2">
		    <Bitcoin /> 
                        <span className="text-lg font-mono">{formatShortNumber(amount)}</span>
			</div>
		    </Button>
		    ))}
		    </div>
      </div>
      </div>
      </DrawerContent>
      </Drawer>
)
}

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

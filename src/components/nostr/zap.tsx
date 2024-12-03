import { useState } from "react";
import { NostrEvent } from "nostr-tools";
import { Bitcoin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RichText } from "@/components/rich-text";
import { Embed } from "@/components/nostr/detail";
import { Group } from "@/lib/types";
import { validateZap } from "@/lib/nip-57";
import { formatShortNumber } from "@/lib/number";
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

// todo: make it beautiful
export function Zap({ event, group }: { event: NostrEvent; group: Group }) {
  const zap = validateZap(event);
  return zap ? (
    <>
      <div className="flex items-center border rounded-lg w-fit px-2">
        <span className="text-muted-foreground">
          <Bitcoin className="size-4" />
        </span>
        <span className="font-mono text-lg">
          {formatShortNumber(zap.amount)}
        </span>
      </div>
      <RichText tags={event.tags} group={group}>
        {zap.content}
      </RichText>
    </>
  ) : (
    <span>Invalid zap</span>
  );
}

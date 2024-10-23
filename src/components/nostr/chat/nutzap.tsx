import type { NostrEvent } from "nostr-tools";
import { Bitcoin, Coins } from "lucide-react";
import { RichText } from "@/components/rich-text";
import { Name } from "@/components/nostr/name";
import type { Group } from "@/lib/types";
import { cn } from "@/lib/utils";

export function NutZap({
  event,
  group,
  className,
}: {
  event: NostrEvent;
  group: Group;
  className?: string;
}) {
  // todo: get amount from proofs
  const rawAmount = event.tags.find((tag) => tag[0] === "amount")?.[1];
  const amount = rawAmount ? Number(rawAmount) : 0; ///? 0;
  const unit =
    event.tags.find((tag) => tag[0] === "unit")?.[1]?.trim() ?? "sat";
  const total = unit === "msat" ? amount / 1000 : amount;
  const receiver = event.tags.find((tag) => tag[0] === "p")?.[1];
  return (
    <div
      className={cn(
        "flex flex-row rounded-lg bg-accent border-2 w-fit max-w-xs sm:max-w-sm md:max-w-md ",
        className,
      )}
    >
      <div className="p-1 px-2">
        <div className="flex flex-row gap-2 items-center">
          <h3 className="font-semibold text-sm">
            <Name pubkey={event.pubkey} />
          </h3>
          {receiver ? (
            <>
              <Coins className="size-3 text-muted-foreground" />
              <h3 className="font-semibold text-sm">
                <Name pubkey={receiver} />
              </h3>
            </>
          ) : null}
        </div>
        <RichText group={group} tags={event.tags}>
          {event.content}
        </RichText>
      </div>
      <div className="flex items-center px-2 bg-background rounded-r-lg">
        <span className="text-muted-foreground">
          <Bitcoin className="size-4" />
        </span>
        <span className="font-mono text-lg">{total}</span>
      </div>
    </div>
  );
}

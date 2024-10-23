import { NostrEvent } from "nostr-tools";
import { Bitcoin } from "lucide-react";
import { RichText } from "@/components/rich-text";
import { Group } from "@/lib/types";
import { validateZap } from "@/lib/nip-57";
import { formatShortNumber } from "@/lib/number";

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

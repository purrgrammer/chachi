import { Name } from "@/components/nostr/name";
import { cn } from "@/lib/utils";

export function Mention({
  pubkey,
  relays,
  className,
}: {
  pubkey: string;
  relays: string[];
  className?: string;
}) {
  return (
    <span className={cn("font-semibold", className)}>
      @<Name pubkey={pubkey} relays={relays} />
    </span>
  );
}

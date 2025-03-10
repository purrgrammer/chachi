import { Name } from "@/components/nostr/name";
import { ProfileDrawer } from "@/components/nostr/profile";
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
  const name = (
    <span className={cn("font-semibold", className)}>
      @<Name pubkey={pubkey} relays={relays} />
    </span>
  );
  return <ProfileDrawer trigger={name} pubkey={pubkey} className={className} />;
}

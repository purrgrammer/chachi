import BoringAvatar from "boring-avatars";
import {
  Avatar as BaseAvatar,
  AvatarImage,
  AvatarFallback,
} from "@/components/ui/avatar";
import { useProfile } from "@/lib/nostr";
import { cn } from "@/lib/utils";

export function Avatar({
  pubkey,
  className,
  relays,
}: {
  pubkey: string;
  className?: string;
  relays?: string[];
}) {
  const { data: profile } = useProfile(pubkey, relays);
  return (
    <BaseAvatar className={cn("size-12", className)}>
      <AvatarImage
        className="object-cover"
        src={profile?.picture}
        alt={pubkey}
      />
      <AvatarFallback delayMs={300}>
        <BoringAvatar
          name={pubkey}
          variant="beam"
          colors={["hsl(262.1 83.3% 57.8%)"]}
        />
      </AvatarFallback>
    </BaseAvatar>
  );
}

import type { ReactNode } from "react";
import { Avatar } from "@/components/nostr/avatar";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { useProfile } from "@/lib/nostr";

export function ProfileCard({
  children,
  pubkey,
  relays,
}: {
  children: ReactNode;
  pubkey: string;
  relays?: string[];
}) {
  const { data: profile } = useProfile(pubkey, relays);
  // todo: rich text bio
  return (
    <HoverCard>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent className="w-80">
        <div className="flex justify-between space-x-4">
          <Avatar pubkey={pubkey} className="size-16" />

          <div className="space-y-1 flex-1">
            <h4 className="text-sm font-semibold">
              {profile?.name || profile?.display_name || pubkey.slice(0, 6)}
            </h4>
            {profile?.about ? (
              <span className="text-sm text-muted-foreground line-clamp-3 break-all">
                {profile.about}
              </span>
            ) : null}
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

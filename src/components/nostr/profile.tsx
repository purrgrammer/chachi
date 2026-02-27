import { LnAddress } from "@/components/zap-stubs";
import { ReactNode, useMemo } from "react";
import { LnAddress } from "@/components/zap-stubs";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { User } from "@/components/nostr/user";
import { useProfile, useRelayList } from "@/lib/nostr";
import { RichText } from "@/components/rich-text";
import type { Group as GroupType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useCopy } from "@/lib/hooks";
import { useNprofile } from "@/lib/nostr";
import { pubkeyToHslString } from "@/lib/color";

function ProfileDrawerContent({
  pubkey,
  group,
}: {
  pubkey: string;
  group?: GroupType;
}) {
  const { data: profile } = useProfile(pubkey);
  const { data: relays } = useRelayList(pubkey);
  const about = profile?.about;
  return (
    <div className="flex flex-col gap-4 mx-auto w-full max-w-sm mb-8">
      <DrawerHeader className="flex flex-col items-center gap-3">
        <div className="flex flex-col gap-0 items-center justify-center">
          <User
            pubkey={pubkey}
            classNames={{
              avatar: "size-16",
              name: "font-semibold text-lg",
              wrapper: "flex-col gap-0",
            }}
            clickAction="link"
          />
          <ProfileColor pubkey={pubkey} relays={relays || []} />
        </div>
        {profile?.lud16 ? (
          <LnAddress address={profile.lud16} />
        ) : null}

        {about ? (
          <RichText
            group={group}
            className="text-sm text-muted-foreground text-center"
          >
            {about}
          </RichText>
        ) : null}
      </DrawerHeader>
    </div>
  );
}

export function ProfileDrawer({
  trigger,
  group,
  pubkey,
  className,
}: {
  trigger: ReactNode;
  pubkey: string;
  group?: GroupType;
  className?: string;
}) {
  return (
    <Drawer>
      <DrawerTrigger className={cn("cursor-pointer", className)}>
        {trigger}
      </DrawerTrigger>
      <DrawerContent>
        <ProfileDrawerContent pubkey={pubkey} group={group} />
      </DrawerContent>
    </Drawer>
  );
}

export function useProfileColor(pubkey: string) {
  const color = useMemo(() => {
    return pubkeyToHslString(pubkey);
  }, [pubkey]);
  return color;
}

export function ProfileColor({
  pubkey,
  relays,
}: {
  pubkey: string;
  relays: string[];
}) {
  const [isCopying, copy] = useCopy();
  const color = useProfileColor(pubkey);
  const nprofile = useNprofile(pubkey, relays);

  return (
    <div
      className={`flex flex-row items-center gap-1 max-w-[210px] ${isCopying ? "pointer-events-none" : "cursor-copy"}`}
      onClick={() => copy(nprofile)}
    >
      <div
        className={`rounded-full size-3 flex-shrink-0`}
        style={{ background: color }}
      ></div>
      <span className="font-light text-xs font-mono text-muted-foreground overflow-hidden text-ellipsis">
        {nprofile}
      </span>
    </div>
  );
}

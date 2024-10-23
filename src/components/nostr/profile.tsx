import { ReactNode } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar } from "@/components/nostr/avatar";
import { Name } from "@/components/nostr/name";
import { useProfile } from "@/lib/nostr";
import { Group } from "@/components/nostr/group";
import { useUserGroups } from "@/lib/nostr/groups";

function ProfileDrawerContent({ pubkey }: { pubkey: string }) {
  const { data: profile } = useProfile(pubkey);
  const { data: groups } = useUserGroups(pubkey);
  const about = profile?.about;
  // todo: rich text bio
  return (
    <div className="flex flex-col gap-4 mx-auto w-full max-w-sm mb-8">
      <DrawerHeader className="flex flex-col items-center gap-3">
        <Avatar pubkey={pubkey} className="size-16" />
        <DrawerTitle>
          <Name pubkey={pubkey} />
        </DrawerTitle>
        {about ? (
          <span className="text-sm text-muted-foreground text-center">
            {about}
          </span>
        ) : null}
        {groups && groups.length > 0 ? (
          <ScrollArea className="h-80">
            {groups.map((group) => (
              <div key={`${group.id}'${group.relay}`} className="mb-2">
                <Group group={group} />
              </div>
            ))}
          </ScrollArea>
        ) : null}
      </DrawerHeader>
    </div>
  );
}

export function ProfileDrawer({
  trigger,
  pubkey,
}: {
  trigger: ReactNode;
  pubkey: string;
}) {
  return (
    <Drawer>
      <DrawerTrigger className="cursor-pointer">{trigger}</DrawerTrigger>
      <DrawerContent>
        <ProfileDrawerContent pubkey={pubkey} />
      </DrawerContent>
    </Drawer>
  );
}

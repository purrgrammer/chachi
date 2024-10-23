"use client";

import { Info, Crown } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar as NostrAvatar } from "@/components/nostr/avatar";
import { Name } from "@/components/nostr/name";
import { RichText } from "@/components/rich-text";
import { useGroup, useGroupParticipants } from "@/lib/nostr/groups";
import { cn } from "@/lib/utils";
import type { Group } from "@/lib/types";

function GroupPicture({
  picture,
  name,
  shortname,
  className,
}: {
  picture?: string;
  name?: string;
  shortname: string;
  className?: string;
}) {
  return (
    <Avatar className={cn("size-9", className)}>
      <AvatarImage
        className="object-cover"
        alt={name || shortname}
        src={picture}
      />
      <AvatarFallback>{shortname}</AvatarFallback>
    </Avatar>
  );
}

function AdminBadge({ role, className }: { role: string; className?: string }) {
  return (
    <Badge
      className={cn(
        "p-1 rounded-xl bg-accent text-accent-foreground hover:bg-accent hover:text-accent-foreground",
        className,
      )}
    >
      <div className="flex flex-row gap-1 items-center">
        <Crown className="size-3" />
        {role}
      </div>
    </Badge>
  );
}

function GroupMember({
  pubkey,
  className,
  isAdmin,
  role,
}: {
  pubkey: string;
  className?: string;
  isAdmin?: boolean;
  role?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between py-2", className)}>
      <div className="flex gap-2 items-center">
        <NostrAvatar pubkey={pubkey} className="size-8" />
        <span>
          <Name pubkey={pubkey} />
        </span>
      </div>
      {isAdmin ? <AdminBadge role={role || "Admin"} /> : null}
    </div>
  );
}

function GroupMembers({ group }: { group: Group }) {
  const { admins, members } = useGroupParticipants(group);
  const nonAdmins = members?.filter((m) => !admins.includes(m)) ?? [];
  return (admins && admins.length > 0) ||
    (nonAdmins && nonAdmins.length > 0) ? (
    <>
      <ScrollArea className="h-80">
        <div className="mb-2">
          <h3 className="text-sm text-muted-foreground">
            Admins ({admins.length})
          </h3>
          {admins.map((pubkey) => (
            <GroupMember isAdmin key={pubkey} pubkey={pubkey} />
          ))}
        </div>
        {nonAdmins.length === 0 ? (
          <span className="text-xs text-muted-foreground">No members</span>
        ) : (
          <>
            <h3 className="text-sm text-muted-foreground">
              Members ({nonAdmins.length})
            </h3>
            {nonAdmins.map((pubkey) => (
              <GroupMember key={pubkey} pubkey={pubkey} />
            ))}
          </>
        )}
      </ScrollArea>
    </>
  ) : null;
}

function GroupInfoContent({ group }: { group: Group }) {
  //const isAdmin = me ? admins?.includes(me) : false;
  //const isMember = me ? members?.includes(me) : false;
  // todo: join/joined status
  // todo: public/private
  // todo: open/closed
  // todo: invite someone
  const { data: metadata } = useGroup(group);
  const { id } = group;
  const name = metadata?.name;
  const about = metadata?.about;
  const picture = metadata?.picture;
  const shortname = name ? name[0] : id.slice(0, 2);
  return (
    <div className="flex flex-col gap-4 w-full max-w-sm lg:max-w-lg mx-auto p-4">
      <DrawerHeader className="flex flex-col items-center gap-3">
        <GroupPicture
          picture={picture}
          name={name}
          shortname={shortname}
          className="size-16"
        />
        <DrawerTitle>{name || id}</DrawerTitle>
        {about ? (
          <DrawerDescription className="text-center">
            <RichText group={group}>{about}</RichText>
          </DrawerDescription>
        ) : null}
      </DrawerHeader>
      {/*
          {isAdmin ? null : (
            <Button
              variant={isMember ? 'destructive' : 'default'}
              className={`w-full ${isMember ? '' : ''}`}
            >
              {isMember ? 'Leave' : 'Join'}
            </Button>
          )}
	  */}
      <GroupMembers group={group} />
    </div>
  );
}

export function GroupInfo({ group }: { group: Group }) {
  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Group info">
          <Info className="size-5" />
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <GroupInfoContent group={group} />
      </DrawerContent>
    </Drawer>
  );
}

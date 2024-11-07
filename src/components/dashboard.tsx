import { useState } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { Search, X, Flame, Activity, Sparkles } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { AvatarList } from "@/components/nostr/avatar-list";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSortedGroups, useUnreadMessages, useUnreads } from "@/lib/messages";
import { Input } from "@/components/ui/input";
import { Highlight } from "@/components/highlight";
import { useGroup, useAllGroups, useCloseGroups } from "@/lib/nostr/groups";
import { groupId, useMyGroups, useOpenGroup } from "@/lib/groups";
import { nip29Relays, getRelayHost, useRelayInfo } from "@/lib/relay";
import { CreateGroup } from "@/components/nostr/groups/create";
import type { Group, GroupMetadata } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

function Heading({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex flex-row items-center gap-1">
      {icon}
      <h3 className="text-sm font-light uppercase">{text}</h3>
    </div>
  );
}

// Activity

function GroupMessages({ group }: { group: Group }) {
  const { data: metadata } = useGroup(group);
  const { data: relayInfo } = useRelayInfo(group.relay);
  const unread = useUnreadMessages(group);
  const isRelayGroup = group.id === "_";
  const img = isRelayGroup ? relayInfo?.icon : metadata?.picture;
  const openGroup = useOpenGroup(group);

  return unread && unread > 0 ? (
    <Reorder.Item dragListener={false} key={groupId(group)} value={group}>
      <Button variant="ghost" className="relative size-14" onClick={openGroup}>
        <Avatar className="size-12 rounded-full">
          <AvatarImage src={img} className="object-cover" />
          <AvatarFallback>
            {metadata?.name?.at(0) || group.id.at(0)}
          </AvatarFallback>
        </Avatar>
        <Badge variant="counter" className="absolute top-0 right-0">
          {unread}
        </Badge>
      </Button>
    </Reorder.Item>
  ) : null;
}

function GroupActivityList() {
  const sortedGroups = useSortedGroups();
  return (
    <Reorder.Group
      axis="x"
      className="px-0 flex flex-row items-center gap-1 overflow-x-auto no-scrollbar w-[calc(100vw-1.5rem)] md:w-[calc(100vw-20rem)]"
      values={sortedGroups}
      onReorder={() => console.log("reorder")}
    >
      {sortedGroups.map((group) => (
        <GroupMessages key={groupId(group)} group={group} />
      ))}
    </Reorder.Group>
  );
}

function GroupsActivity() {
  const myGroups = useMyGroups();
  const unreads = useUnreads(myGroups);
  return (
    <div className="space-y-2">
      <Heading icon={<Activity className="size-4" />} text="Activity" />
      {myGroups.length > 0 && unreads.length > 0 ? (
        <GroupActivityList />
      ) : (
        <span className="text-sm text-muted-foreground">
          Nothing new for you... yet
        </span>
      )}
    </div>
  );
}

// Network

function CloseGroup({
  group,
}: {
  group: { id: string; relay: string; members: string[] };
}) {
  const { id, relay, members } = group;
  const { data: metadata } = useGroup({ id, relay });
  const { data: relayInfo } = useRelayInfo(relay);
  const isRelayGroup = id === "_";
  const about = metadata?.about || relayInfo?.description;
  const name = isRelayGroup ? relayInfo?.name : metadata?.name;
  const img = isRelayGroup ? relayInfo?.icon : metadata?.picture;
  const openGroup = useOpenGroup(group);
  return (
    <Button variant="outline" size="fit" onClick={openGroup}>
      <div className="p-2 rounded-sm w-64 space-y-3">
        <div className="flex flex-row items-center gap-2">
          <Avatar className="size-10 rounded-full">
            <AvatarImage src={img} className="object-cover" />
            <AvatarFallback>{name?.at(0) || id.at(0)}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col items-start overflow-hidden">
            <h3 className="text-lg line-clamp-1">
              {isRelayGroup
                ? relayInfo?.name || id.slice(0, 8)
                : metadata?.name || id.slice(0, 8)}
            </h3>
            <span className="text-xs font-mono">{getRelayHost(relay)}</span>
          </div>
        </div>
        {about ? (
          <p className="text-xs text-muted-foreground break-word whitespace-pre-wrap line-clamp-3">
            {about}
          </p>
        ) : null}
        <AvatarList
          pubkeys={members}
          max={3}
          size="sm"
          suffix=" peers"
          singularSuffix=" peer"
        />
      </div>
    </Button>
  );
}

function NetworkGroups() {
  const { data: groups } = useCloseGroups();
  const myGroups = useMyGroups();
  const sorted =
    groups
      ?.filter((g) => !myGroups.find((mg) => mg.id === g.id))
      .sort((a, b) => b.members.length - a.members.length) ?? [];
  return sorted?.length > 0 ? (
    <div className="space-y-2">
      <Heading
        icon={<Flame className="size-4" />}
        text="Popular in your network"
      />
      <div
        className="flex flex-row gap-2
      w-[calc(100vw-2rem)]
      md:w-[calc(100vw-20rem)]
   group-has-[[data-collapsible=icon]]/sidebar-wrapper:w-[calc(100vw-6rem)]
      overflow-hidden overflow-x-scroll no-scrollbar"
      >
        {sorted.map((group) => (
          <CloseGroup key={group.id} group={group} />
        ))}
      </div>
    </div>
  ) : null;
}

// Featured

function Featured({ group }: { group: Group }) {
  const { id, relay } = group;
  const { data: metadata } = useGroup({ id, relay });
  const { data: relayInfo } = useRelayInfo(relay);
  const isRelayGroup = id === "_";
  const name = isRelayGroup ? relayInfo?.name : metadata?.name;
  const img = isRelayGroup ? relayInfo?.icon : metadata?.picture;
  const about = isRelayGroup ? relayInfo?.description : metadata?.about;
  const openGroup = useOpenGroup(group);
  return (
    <Button variant="outline" size="fit" onClick={openGroup}>
      <div className="p-2 rounded-sm w-64 space-y-3">
        <div className="flex flex-row items-center gap-2">
          <Avatar className="size-10 rounded-full">
            <AvatarImage src={img} className="object-cover" />
            <AvatarFallback>{name?.at(0) || id.at(0)}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col items-start overflow-hidden">
            <h3 className="text-lg line-clamp-1">
              {isRelayGroup
                ? relayInfo?.name || id.slice(0, 8)
                : metadata?.name || id.slice(0, 8)}
            </h3>
            <span className="text-xs font-mono">{getRelayHost(relay)}</span>
          </div>
        </div>
        {about ? (
          <p className="text-xs text-muted-foreground break-word whitespace-pre-wrap line-clamp-3">
            {about}
          </p>
        ) : null}
      </div>
    </Button>
  );
}

const featured = [
  { id: "chachi", relay: "wss://groups.0xchat.com" },
  { id: "825f1ed57f20d06d43e93f3cb8207d61ce8cdfff9d9f6722540329c00fba1b44", relay: "wss://groups.0xchat.com" },
  { id: "nip-29", relay: "wss://groups.0xchat.com" },
];

function FeaturedGroups() {
  return (
    <div className="space-y-2">
      <Heading icon={<Sparkles className="size-4" />} text="Featured" />
      <div
        className="flex flex-row gap-2 
      w-[calc(100vw-2rem)]
      md:w-[calc(100vw-20rem)]
   group-has-[[data-collapsible=icon]]/sidebar-wrapper:w-[calc(100vw-6rem)]
      overflow-hidden overflow-x-scroll no-scrollbar"
      >
        {featured.map((group) => (
          <Featured key={group.id} group={group} />
        ))}
      </div>
    </div>
  );
}

// Search

function GroupSearchResult({
  group,
  search,
  className,
}: {
  group: GroupMetadata;
  search: string;
  className?: string;
}) {
  const openGroup = useOpenGroup(group);
  return (
    <div className={cn("flex flex-col gap-3 p-2 overflow-hidden", className)}>
      <div className="flex flex-row items-start justify-between">
        <div className="flex flex-col gap-4">
          <div className="flex flex-row gap-2">
            <Avatar className="size-10 rounded-full">
              <AvatarImage src={group.picture} className="object-cover" />
              <AvatarFallback>
                {group.name?.at(0) || group.id.at(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-0">
              <h3 className="line-clamp-1">
                <Highlight text={group.name} highlight={search} />
              </h3>
              <span className="text-xs font-mono text-muted-foreground">
                {getRelayHost(group.relay)}
              </span>
            </div>
          </div>
        </div>
        <Button className="ml-auto" size="sm" onClick={openGroup}>
          Visit
        </Button>
      </div>
      <p className="text-sm line-clamp-1 pl-12 text-muted-foreground">
        {group.about ? (
          <Highlight text={group.about} highlight={search} />
        ) : (
          "No description available"
        )}
      </p>
    </div>
  );
}

function GroupSearch() {
  const [search, setSearch] = useState("");
  const allGroups = useAllGroups(nip29Relays);
  const groups = allGroups.flatMap((q) => q.data || []);
  const { result: deduped } = groups.reduce(
    (acc, g) => {
      const id = groupId(g);
      if (acc.seen.has(id)) return acc;
      acc.seen.add(id);
      acc.result.push(g);
      return acc;
    },
    { result: [] as GroupMetadata[], seen: new Set<string>() },
  );
  const minChars = 2;
  const filteredGroups = deduped.filter(
    (g) =>
      g.name.toLowerCase().includes(search.toLowerCase()) ||
      g.about?.toLowerCase().includes(search.toLowerCase()),
  );
  const hasNoResults =
    search.trim().length >= minChars && filteredGroups.length === 0;
  return (
    <div className="flex flex-col items-center justify-center space-y-2">
      <div className="w-64 sm:w-82 md:w-96 space-y-2">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Search className="size-4" />}
          rightIcon={<X />}
          onRightIconClick={() => setSearch("")}
          placeholder="Search groups"
        />
        <span className="text-xs text-muted-foreground ml-1">
          {hasNoResults
            ? `No results for "${search}"`
            : search.trim().length >= minChars && filteredGroups.length > 0
              ? `${filteredGroups.length} results for "${search}"`
              : `Start typing to filter groups`}
        </span>
        <AnimatePresence initial={false}>
          <ScrollArea className="h-80 md:h-96">
            {hasNoResults ? (
              <div className="flex items-center justify-center">
                <div className="text-sm text-muted-foreground">
                  No groups found for "{search}", want to{" "}
                  <CreateGroup>
                    <Button
                      variant="link"
                      className="p-0 text-foreground underline decoration-dotted"
                    >
                      start one
                    </Button>
                  </CreateGroup>
                  ?
                </div>
              </div>
            ) : null}
            {filteredGroups.map((g) => (
              <motion.div
                key={groupId(g)}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              >
                <GroupSearchResult group={g} search={search} />
              </motion.div>
            ))}
          </ScrollArea>
        </AnimatePresence>
      </div>
    </div>
  );
}

function FindGroup() {
  return (
    <div className="flex flex-col md:flex-row items-center gap-2">
      <p className="text-sm font-light">Can't find what you're looking for?</p>
      <Dialog>
        <DialogTrigger>
          <Button
            variant="link"
            size="sm"
            className="p-0 text-foreground underline decoration-dotted"
          >
            <Search /> Search groups
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              <div className="flex flex-row gap-2">
                <Search className="size-4" /> Find a group
              </div>
            </DialogTitle>
          </DialogHeader>
          <GroupSearch />
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function Dashboard() {
  return (
    <div className="overflow-hidden space-y-4 px-2">
      <GroupsActivity />
      <FeaturedGroups />
      <NetworkGroups />
      <FindGroup />
    </div>
  );
}

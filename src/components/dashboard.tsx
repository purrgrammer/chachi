import { useState } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { Search, X, Flame, Activity, Sparkles } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { AvatarList } from "@/components/nostr/avatar-list";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  useSortedGroups,
  useUnreadMessages,
  useUnreadMentions,
  useUnreads,
} from "@/lib/messages";
import { Input } from "@/components/ui/input";
import { Highlight } from "@/components/highlight";
import {
  useGroup,
  useAllGroups,
  useCloseGroups,
  useGroupName,
  useGroupPicture,
} from "@/lib/nostr/groups";
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
import { useTranslation } from "react-i18next";

function Heading({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex flex-row gap-1 items-center">
      {icon}
      <h3 className="text-sm font-light uppercase">{text}</h3>
    </div>
  );
}

// Activity

function GroupMessages({ group }: { group: Group }) {
  const unread = useUnreadMessages(group);
  const unreadMentions = useUnreadMentions(group);
  const mentions = (unreadMentions || 0) as number;
  const name = useGroupName(group);
  const img = useGroupPicture(group);
  const openGroup = useOpenGroup(group);
  const { t } = useTranslation();

  return unread && unread > 0 ? (
    <Reorder.Item dragListener={false} key={groupId(group)} value={group}>
      <Button
        variant="ghost"
        className="relative h-fit min-w-32 w-fit"
        onClick={openGroup}
      >
        <div className="flex flex-col gap-1 items-center">
          <Avatar className="rounded-full size-12">
            <AvatarImage src={img} className="object-cover" />
            <AvatarFallback>{name?.at(0) || group.id.at(0)}</AvatarFallback>
          </Avatar>
          <h3 className="text-lg">{name}</h3>
          <div className="flex flex-col gap-1 items-center text-xs">
            <div
              className={`flex flex-row gap-1 ${unread === 0 ? "opacity-50" : ""}`}
            >
              <span className="font-mono">
                {unread >= 100 ? "99+" : unread}
              </span>
              <span className="text-muted-foreground">
                {t("dashboard.activity.unread")}
              </span>
            </div>
            <div
              className={`flex flex-row gap-1 ${mentions === 0 ? "opacity-50" : ""}`}
            >
              <span className="font-mono">
                {mentions >= 100 ? "99+" : mentions}
              </span>
              <span className="text-muted-foreground">
                {t("dashboard.activity.mentions")}
              </span>
            </div>
          </div>
        </div>
      </Button>
    </Reorder.Item>
  ) : null;
}

function GroupActivityList() {
  const sortedGroups = useSortedGroups();
  return (
    <Reorder.Group
      axis="x"
      className="flex overflow-x-auto flex-row gap-1 items-center px-0 no-scrollbar w-[calc(100vw-1.5rem)] md:w-[calc(100vw-20rem)]"
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
  const { t } = useTranslation();
  return (
    <div className="space-y-2">
      <Heading
        icon={<Activity className="size-4" />}
        text={t("dashboard.activity.heading")}
      />
      {myGroups.length > 0 && unreads.length > 0 ? (
        <GroupActivityList />
      ) : (
        <span className="text-sm text-muted-foreground">
          {t("dashboard.activity.none")}
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
  const { t } = useTranslation();
  return (
    <Button variant="outline" size="fit" onClick={openGroup}>
      <div className="p-2 space-y-3 w-64 rounded-sm">
        <div className="flex flex-row gap-2 items-center">
          <Avatar className="rounded-full size-10">
            <AvatarImage src={img} className="object-cover" />
            <AvatarFallback>{name?.at(0) || id.at(0)}</AvatarFallback>
          </Avatar>
          <div className="flex overflow-hidden flex-col items-start">
            <h3 className="text-lg line-clamp-1">
              {isRelayGroup
                ? relayInfo?.name || id.slice(0, 8)
                : metadata?.name || id.slice(0, 8)}
            </h3>
            <span className="font-mono text-xs">{getRelayHost(relay)}</span>
          </div>
        </div>
        {about ? (
          <p className="text-xs whitespace-pre-wrap text-muted-foreground break-word line-clamp-3">
            {about}
          </p>
        ) : null}
        <AvatarList
          pubkeys={members}
          max={3}
          size="sm"
          suffix={t("peers")}
          singularSuffix={t("peer")}
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
  const { t } = useTranslation();
  return sorted?.length > 0 ? (
    <div className="space-y-2">
      <Heading
        icon={<Flame className="size-4" />}
        text={t("dashboard.popular.heading")}
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
      <div className="p-2 space-y-3 w-64 rounded-sm">
        <div className="flex flex-row gap-2 items-center">
          <Avatar className="rounded-full size-10">
            <AvatarImage src={img} className="object-cover" />
            <AvatarFallback>{name?.at(0) || id.at(0)}</AvatarFallback>
          </Avatar>
          <div className="flex overflow-hidden flex-col items-start">
            <h3 className="text-lg line-clamp-1">
              {isRelayGroup
                ? relayInfo?.name || id.slice(0, 8)
                : metadata?.name || id.slice(0, 8)}
            </h3>
            <span className="font-mono text-xs">{getRelayHost(relay)}</span>
          </div>
        </div>
        {about ? (
          <p className="text-xs whitespace-pre-wrap text-muted-foreground break-word line-clamp-3">
            {about}
          </p>
        ) : null}
      </div>
    </Button>
  );
}

const featured = [
  { id: "chachi", relay: "wss://groups.0xchat.com" },
  {
    id: "825f1ed57f20d06d43e93f3cb8207d61ce8cdfff9d9f6722540329c00fba1b44",
    relay: "wss://groups.0xchat.com",
  },
  { id: "GCpMK1RxaKDnCIvt", relay: "wss://groups.0xchat.com" },
  { id: "nip-29", relay: "wss://groups.0xchat.com" },
];

function FeaturedGroups() {
  const { t } = useTranslation();
  return (
    <div className="space-y-2">
      <Heading
        icon={<Sparkles className="size-4" />}
        text={t("dashboard.featured.heading")}
      />
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
  const { t } = useTranslation();
  return (
    <div className={cn("flex flex-col gap-3 p-2 overflow-hidden", className)}>
      <div className="flex flex-row justify-between items-start">
        <div className="flex flex-col gap-4">
          <div className="flex flex-row gap-2">
            <Avatar className="rounded-full size-10">
              <AvatarImage src={group.picture} className="object-cover" />
              <AvatarFallback>
                {group.name?.at(0) || group.id.at(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-0">
              <h3 className="line-clamp-1">
                <Highlight text={group.name} highlight={search} />
              </h3>
              <span className="font-mono text-xs text-muted-foreground">
                {getRelayHost(group.relay)}
              </span>
            </div>
          </div>
        </div>
        <Button className="ml-auto" size="sm" onClick={openGroup}>
          {t("dashboard.search.result.visit")}
        </Button>
      </div>
      <p className="pl-12 text-sm line-clamp-1 text-muted-foreground">
        {group.about ? (
          <Highlight text={group.about} highlight={search} />
        ) : (
          t("dashboard.search.result.no-description-available")
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
  const n = filteredGroups.length;
  const hasNoResults =
    search.trim().length >= minChars && filteredGroups.length === 0;
  const { t } = useTranslation();
  return (
    <div className="flex flex-col justify-center items-center space-y-2">
      <div className="space-y-2 w-64 md:w-96 sm:w-82">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={
            <div className="flex items-center justify-center w-full h-full mr-4">
              <Search className="size-5" />
            </div>
          }
          rightIcon={<X />}
          onRightIconClick={() => setSearch("")}
          placeholder={t("dashboard.search.input.placeholder")}
        />
        <span className="ml-1 text-xs text-muted-foreground">
          {hasNoResults
            ? t("dashboard.search.input.no-results-for-x", { search })
            : search.trim().length >= minChars && filteredGroups.length > 0
              ? t("dashboard.search.input.n-results-for-x", { n, search })
              : t("dashboard.search.input.start-typing-to-filter-groups")}
        </span>
        <AnimatePresence initial={false}>
          <ScrollArea className="h-80 md:h-96">
            {hasNoResults ? (
              <div className="flex justify-center items-center">
                <div className="text-sm text-muted-foreground">
                  {t("dashboard.search.result.no-groups-found-for-x-want-to", {
                    search,
                  })}
                  <CreateGroup>
                    <Button
                      variant="link"
                      className="p-0 underline text-foreground decoration-dotted"
                    >
                      {t("dashboard.search.result.start-one")}
                    </Button>
                  </CreateGroup>
                  {t("dashboard.search.result.?")}
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
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-2 items-center md:flex-row">
      <p className="text-sm font-light">{t("dashboard.search.prompt")}</p>
      <Dialog>
        <DialogTrigger>
          <Button
            variant="link"
            size="sm"
            className="p-0 underline text-foreground decoration-dotted"
          >
            <Search /> {t("dashboard.search.trigger")}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              <div className="flex flex-row gap-2">
                <Search className="size-4" /> {t("dashboard.search.title")}
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
    <div className="overflow-hidden px-2 space-y-4">
      <GroupsActivity />
      <FeaturedGroups />
      <NetworkGroups />
      <FindGroup />
    </div>
  );
}

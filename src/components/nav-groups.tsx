import { Reorder } from "framer-motion";
import { useParams } from "react-router-dom";
import { useSortedGroups } from "@/lib/messages";
import { groupId } from "@/lib/groups";
import { RichText } from "@/components/rich-text";
import { Name } from "@/components/nostr/name";
import { CreateGroup } from "@/components/nostr/groups/create";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { SidebarMenu, SidebarMenuItem } from "@/components/ui/sidebar";
import { useMyGroups } from "@/lib/groups";
import { useGroup } from "@/lib/nostr/groups";
import { useRelayInfo, getRelayHost } from "@/lib/relay";
import { useNavigate } from "@/lib/navigation";
import { useLastMessage, useUnreadMessages } from "@/lib/messages";
import type { Group } from "@/lib/types";

function RelayItem({ group }: { group: Group }) {
  const { host } = useParams();
  const { data: relayInfo } = useRelayInfo(group.relay);
  const lastMessage = useLastMessage(group);
  const unreadMessages = useUnreadMessages(group);
  const isActive = host === getRelayHost(group.relay);
  const navigate = useNavigate();

  function openGroup() {
    navigate(`/${getRelayHost(group.relay)}`);
  }

  return (
    <div
      className={`flex items-center p-1 py-2 cursor-pointer transition-colors ${isActive ? "bg-accent/50" : "bg-background"} hover:bg-accent/80 overflow-hidden group-has-[[data-collapsible=icon]]/sidebar-wrapper:bg-transparent group-has-[[data-collapsible=icon]]/sidebar-wrapper:py-1 transition-all`}
      onClick={openGroup}
    >
      <div className="flex items-center gap-2">
        <div
          className={`size-10 rounded-full ${isActive ? "group-has-[[data-collapsible=icon]]/sidebar-wrapper:ring-2 ring-primary ring-offset-1 ring-offset-background" : ""} relative`}
        >
          <Avatar className="size-10 shrink-0 rounded-full">
            <AvatarImage src={relayInfo?.picture} className="object-cover" />
            <AvatarFallback>
              <img src={relayInfo?.icon} alt={relayInfo?.name} />
            </AvatarFallback>
          </Avatar>
        </div>
        {unreadMessages && unreadMessages > 0 ? (
          <Badge
            variant="counter"
            className="absolute top-3 right-2 text-xs group-has-[[data-collapsible=icon]]/sidebar-wrapper:top-0 group-has-[[data-collapsible=icon]]/sidebar-wrapper:right-0"
          >
            <span className="text-xs font-light font-mono">
              {unreadMessages >= 100 ? "99+" : unreadMessages}
            </span>
          </Badge>
        ) : null}
        <div className="flex flex-col">
          <h3 className="line-clamp-1">
            {relayInfo?.name || group.id.slice(0, 8)}
          </h3>
          {lastMessage ? (
            <div className="flex flex-row items-center justify-between">
              <div className="flex flex-row items-start line-clamp-1 text-xs text-muted-foreground">
                <span className="font-semibold">
                  <Name pubkey={lastMessage.pubkey} />
                </span>
                <span className="mr-1">:</span>
                <RichText
                  group={group}
                  className="line-clamp-1 leading-none"
                  options={{
                    inline: true,
                    emojis: true,
                    mentions: true,
                    hashtags: true,
                    events: false,
                    ecash: false,
                    video: false,
                    audio: false,
                    youtube: false,
                  }}
                  classNames={{
                    emojis: "size-5 opacity-70",
                  }}
                  tags={lastMessage.tags}
                >
                  {lastMessage.content}
                </RichText>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function GroupItem({ group }: { group: Group }) {
  const lastMessage = useLastMessage(group);
  const navigate = useNavigate();
  const { host, id } = useParams();
  const { data: metadata } = useGroup(group);
  const unreadMessages = useUnreadMessages(group);
  const isActive = host === getRelayHost(group.relay) && id === group.id;

  function openGroup() {
    navigate(`/${getRelayHost(group.relay)}/${group.id}`);
  }

  return (
    <div
      className={`flex items-center p-1 py-2 cursor-pointer transition-colors ${isActive ? "bg-accent/50" : "bg-background"} hover:bg-accent/80 overflow-hidden group-has-[[data-collapsible=icon]]/sidebar-wrapper:bg-transparent group-has-[[data-collapsible=icon]]/sidebar-wrapper:py-1 transition-all`}
      onClick={openGroup}
    >
      <div className="flex items-center gap-2">
        <div
          className={`size-10 rounded-full ${isActive ? "group-has-[[data-collapsible=icon]]/sidebar-wrapper:ring-2 ring-primary ring-offset-1 ring-offset-background" : ""} relative`}
        >
          <Avatar className="size-10 shrink-0 rounded-full">
            <AvatarImage src={metadata?.picture} className="object-cover" />
            <AvatarFallback>
              {metadata?.name?.charAt(0) || group.id.charAt(0)}
            </AvatarFallback>
          </Avatar>
        </div>
        {unreadMessages && unreadMessages > 0 ? (
          <Badge
            variant="counter"
            className="absolute top-3 right-2 text-xs group-has-[[data-collapsible=icon]]/sidebar-wrapper:top-0 group-has-[[data-collapsible=icon]]/sidebar-wrapper:right-0"
          >
            <span className="text-xs font-light font-mono">
              {unreadMessages >= 100 ? "99+" : unreadMessages}
            </span>
	  </Badge>
        ) : null}
        <div className="flex flex-col">
          <h3 className="line-clamp-1">
            {metadata?.name || group.id.slice(0, 8)}
          </h3>
          {lastMessage ? (
            <div className="flex flex-row items-center justify-between">
              <div className="flex flex-row items-start line-clamp-1 text-xs text-muted-foreground">
                <span className="font-semibold">
                  <Name pubkey={lastMessage.pubkey} />
                </span>
                <span className="mr-1">:</span>
                <RichText
                  group={group}
                  className="line-clamp-1 leading-none"
                  options={{
                    inline: true,
                    emojis: true,
                    mentions: true,
                    events: false,
                    urls: false,
                    hashtags: true,
                    ecash: false,
                    images: false,
                    audio: false,
                    video: false,
                    youtube: false,
                  }}
                  classNames={{
                    emojis: "size-5 opacity-70",
                  }}
                  tags={lastMessage.tags}
                >
                  {lastMessage.content}
                </RichText>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function MyGroupList() {
  const sortedGroups = useSortedGroups();
  return (
    <SidebarMenu className="gap-0">
      <Reorder.Group
        axis="y"
        layoutScroll
        values={sortedGroups}
        onReorder={() => console.log("reorder")}
      >
        {sortedGroups.map((group) => (
          <Reorder.Item dragListener={false} key={groupId(group)} value={group}>
            <SidebarMenuItem>
              {group.id === "_" ? (
                <RelayItem group={group} />
              ) : (
                <GroupItem group={group} />
              )}
            </SidebarMenuItem>
          </Reorder.Item>
        ))}
      </Reorder.Group>
      <CreateGroup className="group-has-[[data-collapsible=icon]]/sidebar-wrapper:hidden" />
    </SidebarMenu>
  );
}

export function NavGroups() {
  const myGroups = useMyGroups();
  return myGroups.length > 0 ? (
    <MyGroupList />
  ) : (
    <div className="flex items-center justify-center">
      <span className="group-has-[[data-collapsible=icon]]/sidebar-wrapper:hidden text-sm text-muted-foreground">
        No groups
      </span>
    </div>
  );
}

import { Reorder } from "framer-motion";
import { useParams } from "react-router-dom";
import { useSortedGroups } from "@/lib/messages";
import { useTranslation } from "react-i18next";
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
import {
  useLastMessage,
  useUnreadMessages,
  //useUnreadMentions,
} from "@/lib/messages";
import type { Group } from "@/lib/types";

function RelayItem({ group }: { group: Group }) {
  const { host } = useParams();
  const { data: relayInfo } = useRelayInfo(group.relay);
  const lastMessage = useLastMessage(group);
  const unreadMessages = useUnreadMessages(group);
  //const unreadMentions = useUnreadMentions(group);
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
      <div className="flex gap-2 items-center">
        <div
          className={`size-10 rounded-full ${isActive ? "group-has-[[data-collapsible=icon]]/sidebar-wrapper:ring-2 ring-primary ring-offset-1 ring-offset-background" : ""} relative`}
        >
          <Avatar className="rounded-full size-10 shrink-0">
            <AvatarImage src={relayInfo?.icon} className="object-cover" />
            <AvatarFallback>
              <img src={relayInfo?.icon} alt={relayInfo?.name} />
            </AvatarFallback>
          </Avatar>
        </div>
        <div
          className={`flex flex-row gap-1 absolute top-3 right-2 group-has-[[data-collapsible=icon]]/sidebar-wrapper:top-0 group-has-[[data-collapsible=icon]]/sidebar-wrapper:right-0`}
        >
          {unreadMessages && unreadMessages > 0 ? (
            <Badge variant="counter">
              <span className="font-mono text-xs font-light">
                {unreadMessages >= 100 ? "99+" : unreadMessages}
              </span>
            </Badge>
          ) : null}
        </div>
        <div className="flex flex-col">
          <h3 className="line-clamp-1">
            {relayInfo?.name || group.id.slice(0, 8)}
          </h3>
          {lastMessage ? (
            <div className="flex flex-row justify-between items-center">
              <div className="flex flex-row items-start text-xs line-clamp-1 text-muted-foreground">
                <span className="font-semibold">
                  <Name pubkey={lastMessage.pubkey} short />
                </span>
                <span className="mr-1">:</span>
                <RichText
                  group={group}
                  className="leading-none line-clamp-1"
                  options={{
                    inline: true,
                    emojis: true,
                    mentions: true,
                    hashtags: true,
                    events: false,
                    ecash: false,
                    codeBlock: false,
                    syntax: false,
                    images: false,
                    video: false,
                    audio: false,
                    youtube: false,
                  }}
                  classNames={{
                    emojis: "size-4 opacity-70",
                    spans: "break-all",
                    urls: "pointer-events-none",
                    mentions: "pointer-events-none",
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
  const { host, id, pubkey } = useParams();
  const { data: metadata } = useGroup(group);
  const unreadMessages = useUnreadMessages(group);
  //const unreadMentions = useUnreadMentions(group);
  const isActive = host
    ? host === getRelayHost(group.relay) && id === group.id
    : pubkey === group.id;

  function openGroup() {
    if (metadata?.isCommunity) {
      navigate(`/c/${group.id}`);
    } else {
      navigate(`/${getRelayHost(group.relay)}/${group.id}`);
    }
  }

  return (
    <div
      className={`flex items-center p-1 py-2 cursor-pointer transition-colors ${isActive ? "bg-accent/50" : "bg-background"} hover:bg-accent/80 overflow-hidden group-has-[[data-collapsible=icon]]/sidebar-wrapper:bg-transparent group-has-[[data-collapsible=icon]]/sidebar-wrapper:py-1 transition-all`}
      onClick={openGroup}
    >
      <div className="flex gap-2 items-center">
        <div
          className={`size-10 rounded-full ${isActive ? "group-has-[[data-collapsible=icon]]/sidebar-wrapper:ring-2 ring-primary ring-offset-1 ring-offset-background" : ""} relative`}
        >
          <Avatar className="rounded-full size-10 shrink-0">
            <AvatarImage src={metadata?.picture} className="object-cover" />
            <AvatarFallback>
              {metadata?.name?.charAt(0) || group.id.charAt(0)}
            </AvatarFallback>
          </Avatar>
        </div>
        <div className="flex flex-row gap-1 absolute top-3 right-2 group-has-[[data-collapsible=icon]]/sidebar-wrapper:top-0 group-has-[[data-collapsible=icon]]/sidebar-wrapper:right-0">
          {unreadMessages && unreadMessages > 0 ? (
            <Badge variant="counter">
              <span className="font-mono text-xs font-light">
                {unreadMessages >= 100 ? "99+" : unreadMessages}
              </span>
            </Badge>
          ) : null}
        </div>
        <div className="flex flex-col">
          <h3 className="line-clamp-1">
            {metadata?.name || group.id.slice(0, 8)}
          </h3>
          {lastMessage ? (
            <div className="flex flex-row justify-between items-center">
              <div className="flex flex-row items-start text-xs line-clamp-1 text-muted-foreground">
                <span className="font-semibold">
                  <Name pubkey={lastMessage.pubkey} short />
                </span>
                <span className="mr-1">:</span>
                <RichText
                  group={group}
                  className="leading-none line-clamp-1"
                  options={{
                    inline: true,
                    emojis: true,
                    mentions: true,
                    events: false,
                    urls: false,
                    hashtags: true,
                    ecash: false,
                    codeBlock: false,
                    syntax: false,
                    images: false,
                    audio: false,
                    video: false,
                    youtube: false,
                  }}
                  classNames={{
                    emojis: "size-4 opacity-70",
                    spans: "break-all",
                    mentions: "pointer-events-none",
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
  const { t } = useTranslation();
  return myGroups.length > 0 ? (
    <MyGroupList />
  ) : (
    <div className="flex justify-center items-center">
      <span className="group-has-[[data-collapsible=icon]]/sidebar-wrapper:hidden text-sm text-muted-foreground">
        {t("nav.no-groups")}
      </span>
    </div>
  );
}

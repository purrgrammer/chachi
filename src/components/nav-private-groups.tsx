import { MessageSquarePlus, Users } from "lucide-react";
import { Reorder } from "framer-motion";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { RichText } from "@/components/rich-text";
import { Badge } from "@/components/ui/badge";
import { Name } from "@/components/nostr/name";
import { Avatar } from "@/components/nostr/avatar";
import { CreateGroup } from "@/components/nostr/dm/create";
import { SidebarMenu, SidebarMenuItem } from "@/components/ui/sidebar";
import { useNavigate } from "@/lib/navigation";
import {
  //  useLastMessage,
  useUnreadMessages,
  //  //useUnreadMentions,
} from "@/lib/nostr/dm";
import {
  useSortedGroups,
  useSortedGroupRequests,
  useLastMessage,
} from "@/lib/nostr/dm";
import type { PrivateGroup } from "@/lib/types";
import { useMyGroups } from "@/lib/groups";
import { useUnreads } from "@/lib/messages";

function GroupItem({ group }: { group: PrivateGroup }) {
  const lastMessage = useLastMessage(group);
  const navigate = useNavigate();
  const { id } = useParams();
  //const { data: metadata } = useGroup(group);
  const unreadMessages = useUnreadMessages(group);
  //const unreadMentions = useUnreadMentions(group);
  const isActive = id === group.id;
  const isSingle = group.pubkeys.length === 1;
  const firstPubkey = group.pubkeys[0];

  function openGroup() {
    navigate(`/dm/${group.id}`);
  }

  return (
    <div
      className={`flex flex-row gap-2 items-center p-1 py-2 cursor-pointer transition-colors ${isActive ? "bg-accent/50" : "bg-background"} hover:bg-accent/80 overflow-hidden group-has-[[data-collapsible=icon]]/sidebar-wrapper:bg-transparent group-has-[[data-collapsible=icon]]/sidebar-wrapper:py-1 transition-all`}
      onClick={openGroup}
    >
      <div
        className={`size-10 rounded-full ${isActive ? "group-has-[[data-collapsible=icon]]/sidebar-wrapper:ring-2 ring-primary ring-offset-1 ring-offset-background" : ""} relative`}
      >
        {isSingle ? <Avatar pubkey={firstPubkey} className="size-10" /> : null}
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
      <div className="flex flex-row gap-2 items-center">
        <div className="flex flex-col">
          <h3 className="line-clamp-1">
            <Name pubkey={firstPubkey} />
          </h3>
          {lastMessage ? (
            <RichText
              className="text-xs text-muted-foreground leading-none line-clamp-1"
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
                emojis: "size-4 opacity-70",
                spans: "break-all",
              }}
              tags={lastMessage.tags}
            >
              {lastMessage.content}
            </RichText>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function PublicGroups() {
  const navigate = useNavigate();

  const { t } = useTranslation();
  const myGroups = useMyGroups();
  const unreads = useUnreads(myGroups);
  // todo: unread messages count
  return (
    <div
      className={`flex flex-row gap-2 items-center p-1 py-2 cursor-pointer transition-colors hover:bg-accent/80 overflow-hidden group-has-[[data-collapsible=icon]]/sidebar-wrapper:bg-transparent group-has-[[data-collapsible=icon]]/sidebar-wrapper:py-1 transition-all relative`}
      onClick={() => navigate("/")}
    >
      <div className={`size-10 rounded-full relative`}>
        <Users className="size-10 text-muted-foreground" />
      </div>
      <div className="flex flex-row gap-2 items-center">
        <div className="flex flex-col">
          <h3 className="line-clamp-1">{t("private-group.groups")}</h3>
        </div>
      </div>
      <div
        className={`flex flex-row gap-1 absolute top-3 right-2 group-has-[[data-collapsible=icon]]/sidebar-wrapper:top-0 group-has-[[data-collapsible=icon]]/sidebar-wrapper:right-0`}
      >
        {unreads.length > 0 ? (
          <Badge variant="counter">
            <span className="font-mono text-xs font-light">
              {unreads.length >= 100 ? "99+" : unreads.length}
            </span>
          </Badge>
        ) : null}
      </div>
    </div>
  );
}

function MyGroupList({
  groups,
  showPublicGroups = true,
}: {
  groups: PrivateGroup[];
  showPublicGroups?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <SidebarMenu className="gap-0">
      {showPublicGroups ? <PublicGroups /> : null}
      {groups.length > 0 ? (
        <Reorder.Group
          axis="y"
          layoutScroll
        values={groups}
        onReorder={() => console.log("reorder")}
      >
        {groups.map((group) => (
          <Reorder.Item dragListener={false} key={group.id} value={group}>
            <SidebarMenuItem>
                <GroupItem group={group} />
            </SidebarMenuItem>
            </Reorder.Item>
          ))}
        </Reorder.Group>
      ) : (
        <div className="flex justify-center items-center">
          <span className="text-sm text-muted-foreground">
            {t("nav.no-private-groups")}
          </span>
        </div>
      )}
    </SidebarMenu>
  );
}

function MyGroupRequests({ groups }: { groups: PrivateGroup[] }) {
  const { t } = useTranslation();
  return (
    <>
      {groups.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-row items-center justify-between mx-1">
            <div className="flex flex-row gap-1 ml-2 items-center text-muted-foreground">
              <MessageSquarePlus className="size-3" />
              <h3 className="text-sm uppercase font-light">
                {t("private-group.requests")}
              </h3>
            </div>
            {groups.length > 0 ? (
              <Badge variant="counter">{groups.length}</Badge>
            ) : null}
          </div>
          <div className="opacity-30">
            <MyGroupList groups={groups} showPublicGroups={false} />
          </div>
        </div>
      ) : null}
    </>
  );
}

export function NavPrivateGroups() {
  const myGroups = useSortedGroups();
  const myGroupRequests = useSortedGroupRequests();
  return (
    <>
      <MyGroupList groups={myGroups} />
      <CreateGroup />
      <MyGroupRequests groups={myGroupRequests || []} />
    </>
  );
}

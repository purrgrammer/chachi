import { Bookmark, MessageSquarePlus, Users } from "lucide-react";
import { Reorder } from "framer-motion";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LazyRichText } from "@/components/lazy/LazyRichText";
import { Badge } from "@/components/ui/badge";
import { Name } from "@/components/nostr/name";
import { NameList } from "@/components/nostr/name-list";
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
import { usePubkey } from "@/lib/account";

function GroupAvatar({ pubkeys }: { pubkeys: string[] }) {
  // If there's only one pubkey, just show a normal avatar
  if (pubkeys.length === 1) {
    return <Avatar pubkey={pubkeys[0]} className="size-10" />;
  }

  // For multiple pubkeys, arrange them in a circle
  // Limit to max 5 avatars to prevent overcrowding
  const displayPubkeys = pubkeys.slice(0, 5);
  const totalAvatars = displayPubkeys.length;

  // Calculate size based on number of avatars
  const avatarSize = totalAvatars <= 3 ? "size-4" : "size-3";

  return (
    <div className="size-10 relative rounded-full bg-accent flex items-center justify-center">
      {displayPubkeys.map((pubkey, index) => {
        // Calculate positions for specific numbers of avatars
        let positionClass = "absolute ring-1 ring-background ";

        // Add size class
        positionClass += avatarSize + " ";

        // Handle common group sizes with specific positioning
        if (totalAvatars === 2) {
          positionClass +=
            index === 0
              ? "-translate-x-2.5 -translate-y-1.5"
              : "translate-x-2.5 translate-y-1.5";
        } else if (totalAvatars === 3) {
          if (index === 0) positionClass += "-translate-y-2";
          else if (index === 1) positionClass += "-translate-x-2 translate-y-1";
          else positionClass += "translate-x-2 translate-y-1";
        } else if (totalAvatars === 4) {
          if (index === 0) positionClass += "-translate-x-2 -translate-y-2";
          else if (index === 1) positionClass += "translate-x-2 -translate-y-2";
          else if (index === 2) positionClass += "-translate-x-2 translate-y-2";
          else positionClass += "translate-x-2 translate-y-2";
        } else {
          // For 5 or more, use a simple circular layout with specific positions
          if (index === 0) positionClass += "translate-y-[-2.5rem]";
          else if (index === 1)
            positionClass += "translate-x-[2.4rem] translate-y-[-0.8rem]";
          else if (index === 2)
            positionClass += "translate-x-[1.5rem] translate-y-[2rem]";
          else if (index === 3)
            positionClass += "translate-x-[-1.5rem] translate-y-[2rem]";
          else positionClass += "translate-x-[-2.4rem] translate-y-[-0.8rem]";
        }

        return (
          <Avatar key={pubkey} pubkey={pubkey} className={positionClass} />
        );
      })}
    </div>
  );
}

function GroupItem({ group }: { group: PrivateGroup }) {
  const lastMessage = useLastMessage(group);
  const navigate = useNavigate();
  const { id } = useParams();
  const unreadMessages = useUnreadMessages(group);
  const isActive = id === group.id;
  const isSingle = group.pubkeys.length === 1;
  const me = usePubkey();
  const recipients = group.pubkeys.filter((p) => p !== me);
  const firstPubkey = recipients[0];
  const { t } = useTranslation();
  const isSavedMessages = isSingle && group.pubkeys[0] === me;

  function openGroup() {
    navigate(`/dm/${group.id}`);
  }

  return (
    <div
      className={`flex flex-row gap-2 items-center p-1 py-2 cursor-pointer transition-colors ${isActive ? "bg-accent/50" : "bg-background"} hover:bg-accent/80 overflow-hidden group-has-[[data-collapsible=icon]]/sidebar-wrapper:bg-transparent group-has-[[data-collapsible=icon]]/sidebar-wrapper:py-1 transition-all`}
      onClick={openGroup}
    >
      <div
        className={`size-10 ${isActive ? "group-has-[[data-collapsible=icon]]/sidebar-wrapper:ring-2 ring-primary ring-offset-1 ring-offset-background" : ""} relative`}
      >
        {isSavedMessages ? (
          <Bookmark className="size-10 text-muted-foreground" />
        ) : isSingle ? (
          <Avatar
            pubkey={firstPubkey ? firstPubkey : group.pubkeys[0]}
            className="size-10"
          />
        ) : (
          <GroupAvatar pubkeys={group.pubkeys} />
        )}
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
            {isSavedMessages ? (
              <span className="text-muted-foreground">
                {t("private-group.saved-messages")}
              </span>
            ) : isSingle ? (
              <Name pubkey={firstPubkey ? firstPubkey : group.pubkeys[0]} />
            ) : (
              <NameList
                notClickable
                className="line-clamp-1"
                pubkeys={group.pubkeys}
                avatarClassName="hidden"
                textClassName="font-normal"
              />
            )}
          </h3>
          {lastMessage ? (
            <LazyRichText
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
            </LazyRichText>
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
  const unreadMessages = unreads.reduce((acc, curr) => acc + curr.count, 0);
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
        {unreadMessages > 0 ? (
          <Badge variant="counter">
            <span className="font-mono text-xs font-light">
              {unreadMessages >= 100 ? "99+" : unreadMessages}
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
        <div className="flex flex-col gap-1.5 group-has-[[data-collapsible=icon]]/sidebar-wrapper:hidden">
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
      <CreateGroup className="group-has-[[data-collapsible=icon]]/sidebar-wrapper:hidden" />
      <MyGroupRequests groups={myGroupRequests || []} />
    </>
  );
}

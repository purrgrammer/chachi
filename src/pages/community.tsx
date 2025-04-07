import { useNavigate, useParams } from "react-router-dom";
import { Castle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Navigate } from "react-router-dom";
import { Header } from "@/components/header";
import { User } from "@/components/nostr/user";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/nav-tabs";
import { groupId } from "@/lib/groups";
import { GroupChat } from "@/components/nostr/groups/chat";
import { GroupPosts } from "@/components/nostr/posts/feed";
import { GroupVideos } from "@/components/nostr/videos";
import { GroupImages } from "@/components/nostr/images";
import { GroupPolls } from "@/components/nostr/polls";
import { useCommunity } from "@/lib/nostr/groups";
import type { Community } from "@/lib/types";
import { GroupInfo } from "@/components/nostr/groups/info";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { BookmarkGroup } from "@/components/nostr/groups/bookmark";
import { CommunityEdit } from "@/components/nostr/groups/community-edit";
import { usePubkey } from "@/lib/account";

type GroupTab = "chat" | "posts" | "videos" | "images" | "polls";

function CommunityHeader({
  pubkey,
  community,
}: {
  pubkey: string;
  community?: Community;
}) {
  const group = community
    ? {
        id: pubkey,
        relay: community.relay,
      }
    : null;
  const { t } = useTranslation();
  const userPubkey = usePubkey();
  const isOwner = userPubkey === pubkey;

  return (
    <Header>
      <div className="flex items-center w-full justify-between">
        <User
          notClickable
          pubkey={pubkey}
          classNames={{
            avatar: "size-8 rounded-full",
            name: "text-lg font-normal line-clamp-1",
          }}
        />
        <div className="flex flex-row items-center gap-2">
          <Tooltip>
            <TooltipTrigger>
              <Castle className="size-3 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent>{t("group.metadata.community")}</TooltipContent>
          </Tooltip>
          <Separator orientation="vertical" className="ml-3 h-4" />
          {isOwner && <CommunityEdit pubkey={pubkey} />}
          {group ? <BookmarkGroup group={group} /> : null}
          {group ? <GroupInfo group={group} /> : null}
        </div>
      </div>
    </Header>
  );
}

function CommunityContent({ pubkey, tab }: { pubkey: string; tab: GroupTab }) {
  const navigate = useNavigate();
  const { data: community } = useCommunity(pubkey);
  const { t } = useTranslation();
  const group = community
    ? {
        id: pubkey,
        relay: community.relay,
      }
    : null;

  function onValueChange(value: string) {
    navigate(value === "chat" ? `/c/${pubkey}` : `/c/${pubkey}/${value}`);
  }

  return (
    <div>
      <CommunityHeader pubkey={pubkey} community={community} />
      {community && group ? (
        <Tabs value={tab} onValueChange={onValueChange}>
          <TabsList>
            <TabsTrigger value="chat">{t("content.type.chat")}</TabsTrigger>
            <TabsTrigger value="posts">{t("content.type.posts")}</TabsTrigger>
            <TabsTrigger value="videos">{t("content.type.videos")}</TabsTrigger>
            <TabsTrigger value="images">{t("content.type.images")}</TabsTrigger>
            <TabsTrigger value="polls">{t("content.type.polls")}</TabsTrigger>
          </TabsList>
          <TabsContent asChild value="chat">
            <GroupChat key={groupId(group)} group={group} />
          </TabsContent>
          <TabsContent asChild value="posts">
            <GroupPosts key={groupId(group)} group={group} />
          </TabsContent>
          <TabsContent asChild value="videos">
            <GroupVideos key={groupId(group)} group={group} />
          </TabsContent>
          <TabsContent asChild value="images">
            <GroupImages key={groupId(group)} group={group} />
          </TabsContent>
          <TabsContent asChild value="polls">
            <GroupPolls key={groupId(group)} group={group} />
          </TabsContent>
        </Tabs>
      ) : null}
    </div>
  );
}

export default function Community({ tab = "chat" }: { tab?: GroupTab }) {
  const { pubkey } = useParams();
  if (!pubkey) {
    return <Navigate to="/" />;
  }
  return <CommunityContent tab={tab} pubkey={pubkey} />;
}

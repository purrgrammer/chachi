import { useNavigate, useParams } from "react-router-dom";
import { Castle, CloudUpload, Info, Landmark, Server } from "lucide-react";
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
import { GroupArticles } from "@/components/nostr/articles";
import { GroupVideos } from "@/components/nostr/videos";
import { GroupImages } from "@/components/nostr/images";
import { GroupPolls } from "@/components/nostr/polls";
import { useCommunity } from "@/lib/nostr/groups";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Community } from "@/lib/types";
import { useProfile } from "@/lib/nostr";
import { RichText } from "@/components/rich-text";
import { RelayLink } from "@/components/nostr/relay";
import { MintLink } from "@/components/mint";
import { BlossomLink } from "@/components/blossom";
import { Name } from "@/components/nostr/name";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Avatar } from "@/components/nostr/avatar";
import { BookmarkGroup } from "@/components/nostr/groups/bookmark";

type GroupTab = "chat" | "posts" | "articles" | "videos" | "images" | "polls";

function CommunityInfo({
  pubkey,
  community,
}: {
  pubkey: string;
  community?: Community;
}) {
  const { t } = useTranslation();
  const { data: profile } = useProfile(pubkey);
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Info className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            <div className="flex flex-row items-center gap-2">
              <Castle className="size-7 text-muted-foreground" />
              <Avatar className="size-9 rounded-full" pubkey={pubkey} />
              <div className="flex flex-col gap-0">
                <h3 className="text-lg font-semibold leading-none">
                  <Name pubkey={pubkey} />
                </h3>
                {profile?.about ? (
                  <RichText
                    options={{ inline: true }}
                    className="text-sm text-muted-foreground font-normal line-clamp-1"
                    tags={profile.tags}
                  >
                    {profile.about}
                  </RichText>
                ) : null}
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 justify-around">
          {community?.relay ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Server className="size-4 text-muted-foreground" />
                <h3 className="text-sm text-muted-foreground uppercase">
                  {t("community.relays.title")}
                </h3>
              </div>
              <div className="flex flex-wrap gap-2">
                <RelayLink
                  relay={community.relay}
                  classNames={{ icon: "size-4", name: "text-sm" }}
                />
              </div>
            </div>
          ) : null}

          {community?.blossom && community.blossom.length > 0 ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <CloudUpload className="size-4 text-muted-foreground" />
                <h3 className="text-sm text-muted-foreground uppercase">
                  {t("community.blossom.title")}
                </h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {community.blossom.map((blossom) => (
                  <BlossomLink
                    key={blossom}
                    url={blossom}
                    classNames={{ icon: "size-4", name: "text-sm" }}
                  />
                ))}
              </div>
            </div>
          ) : null}

          {community?.mint ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Landmark className="size-4 text-muted-foreground" />
                <h3 className="text-sm text-muted-foreground uppercase">
                  {t("community.mint.title")}
                </h3>
              </div>
              <div className="flex flex-wrap gap-2">
                <MintLink
                  url={community.mint}
                  classNames={{ icon: "size-4", name: "text-sm" }}
                />
              </div>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

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
          {group ? <BookmarkGroup group={group} /> : null}
          <CommunityInfo pubkey={pubkey} community={community} />
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
            <TabsTrigger value="articles">
              {t("content.type.articles")}
            </TabsTrigger>
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
          <TabsContent asChild value="articles">
            <GroupArticles key={groupId(group)} group={group} />
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

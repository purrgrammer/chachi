import { lazy, Suspense } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { GroupHeader } from "@/components/nostr/groups/header";
import { GroupChat } from "@/components/nostr/groups/chat";
import { GroupPosts } from "@/components/nostr/posts/feed";
import { GroupVideos } from "@/components/nostr/videos";
//import { GroupArticles } from "@/components/nostr/articles";
import { GroupImages } from "@/components/nostr/images";
import { GroupPolls } from "@/components/nostr/polls";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/nav-tabs";
import { groupId } from "@/lib/groups";
import { normalizeRelayFromParam } from "@/lib/relay";
import { useGroup } from "@/lib/nostr/groups";

const LazyLivekitRoom = lazy(
  () => import("@/components/nostr/groups/livekit-room").then((m) => ({ default: m.LivekitRoomView })),
);

type GroupTab = "chat" | "posts" | "videos" | "images" | "polls" | "room";

export default function GroupPage({ tab }: { tab?: GroupTab }) {
  const navigate = useNavigate();
  const { host, id } = useParams();
  const group = {
    id: id || "_",
    relay: normalizeRelayFromParam(host || ""),
  };
  const { data: metadata } = useGroup(group);

  const isLivekit = metadata?.isLivekit;
  const isNoText = metadata?.isNoText;

  // For AV-only groups, default to room tab; otherwise default to chat
  const effectiveTab = tab ?? (isLivekit && isNoText ? "room" : "chat");

  function onValueChange(value: string) {
    if (group.id === "_") {
      navigate(value === "chat" ? `/${host}` : `/${value}/${host}`);
    } else {
      navigate(value === "chat" ? `/${host}/${id}` : `/${value}/${host}/${id}`);
    }
  }

  // todo: error handling

  const { t } = useTranslation();

  // AV-only groups: show only the LiveKit room
  if (isLivekit && isNoText) {
    return (
      <div className="flex flex-col h-[100dvh]">
        <GroupHeader group={group} />
        <Suspense
          fallback={
            <div className="flex flex-1 items-center justify-center p-8">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          }
        >
          <LazyLivekitRoom group={group} />
        </Suspense>
      </div>
    );
  }

  return (
    <>
      <GroupHeader group={group} />
      <Tabs value={effectiveTab} onValueChange={onValueChange}>
        <TabsList
          className="
          overflow-x-auto no-scrollbar
	  w-[100dvw]
md:w-[calc(100dvw-18rem)]
         group-has-[[data-collapsible=icon]]/sidebar-wrapper:w-[calc(100dvw-18rem)"
        >
          <TabsTrigger value="chat">{t("content.type.chat")}</TabsTrigger>
          <TabsTrigger value="posts">{t("content.type.posts")}</TabsTrigger>
          <TabsTrigger value="videos">{t("content.type.videos")}</TabsTrigger>
          <TabsTrigger value="images">{t("content.type.images")}</TabsTrigger>
          {/*<TabsTrigger value="articles">Articles</TabsTrigger>
           */}
          <TabsTrigger value="polls">{t("content.type.polls")}</TabsTrigger>
          {isLivekit ? (
            <TabsTrigger value="room">{t("content.type.room")}</TabsTrigger>
          ) : null}
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
        {/*
	<TabsContent asChild value="articles">
          <GroupArticles key={groupId(group)} group={group} />
        </TabsContent>
	*/}
        <TabsContent asChild value="polls">
          <GroupPolls key={groupId(group)} group={group} />
        </TabsContent>
        {isLivekit ? (
          <TabsContent value="room" className="flex flex-col flex-1">
            <Suspense
              fallback={
                <div className="flex flex-1 items-center justify-center p-8">
                  <Loader2 className="size-6 animate-spin text-muted-foreground" />
                </div>
              }
            >
              <LazyLivekitRoom group={group} />
            </Suspense>
          </TabsContent>
        ) : null}
      </Tabs>
    </>
  );
}

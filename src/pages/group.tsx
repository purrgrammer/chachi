import { lazy, Suspense, useRef, useState, useEffect, useCallback } from "react";
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

const LazyLivekitBar = lazy(
  () => import("@/components/nostr/groups/livekit-room").then((m) => ({ default: m.LivekitBar })),
);

type GroupTab = "chat" | "posts" | "videos" | "images" | "polls";

export default function GroupPage({ tab }: { tab?: GroupTab }) {
  const navigate = useNavigate();
  const { host, id } = useParams();
  const group = {
    id: id || "_",
    relay: normalizeRelayFromParam(host || ""),
  };
  const { data: metadata } = useGroup(group);

  const isLivekit = metadata?.isLivekit;

  const effectiveTab = tab ?? "chat";

  // Track LiveKit bar height so chat can adjust
  const livekitBarRef = useRef<HTMLDivElement>(null);
  const [livekitBarHeight, setLivekitBarHeight] = useState(0);

  const updateBarHeight = useCallback(() => {
    if (livekitBarRef.current) {
      setLivekitBarHeight(livekitBarRef.current.offsetHeight);
    }
  }, []);

  useEffect(() => {
    const el = livekitBarRef.current;
    if (!el) {
      setLivekitBarHeight(0);
      return;
    }
    const observer = new ResizeObserver(updateBarHeight);
    observer.observe(el);
    updateBarHeight();
    return () => observer.disconnect();
  }, [isLivekit, updateBarHeight]);

  function onValueChange(value: string) {
    if (group.id === "_") {
      navigate(value === "chat" ? `/${host}` : `/${value}/${host}`);
    } else {
      navigate(value === "chat" ? `/${host}/${id}` : `/${value}/${host}/${id}`);
    }
  }

  // todo: error handling

  const { t } = useTranslation();

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
        </TabsList>
        <TabsContent asChild value="chat">
          <div>
            {isLivekit ? (
              <div ref={livekitBarRef}>
                <Suspense
                  fallback={
                    <div className="flex items-center justify-center p-2 border-b">
                      <Loader2 className="size-4 animate-spin text-muted-foreground" />
                    </div>
                  }
                >
                  <LazyLivekitBar group={group} />
                </Suspense>
              </div>
            ) : null}
            <GroupChat key={groupId(group)} group={group} extraHeight={livekitBarHeight} />
          </div>
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
      </Tabs>
    </>
  );
}

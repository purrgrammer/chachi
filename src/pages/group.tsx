import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
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

type GroupTab = "chat" | "posts" | "videos" | "images" | "polls";

export default function GroupPage({ tab = "chat" }: { tab?: GroupTab }) {
  const navigate = useNavigate();
  const { host, id } = useParams();
  const group = {
    id: id || "_",
    relay: `wss://${host}`,
  };

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
      <Tabs value={tab} onValueChange={onValueChange}>
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
      </Tabs>
    </>
  );
}

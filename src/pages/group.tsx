import { useParams } from "react-router-dom";
import { GroupHeader } from "@/components/nostr/groups/header";
import { GroupChat } from "@/components/nostr/groups/chat";
import { GroupPosts } from "@/components/nostr/posts/feed";
//import { GroupArticles } from "@/components/nostr/articles";
import { GroupPolls } from "@/components/nostr/polls";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/nav-tabs";
import { groupId } from "@/lib/groups";

export default function GroupPage({
  page,
}: {
  page?: "chat" | "posts" | "articles";
}) {
  const { host, id } = useParams();
  const group = {
    id: id || "_",
    relay: `wss://${host}`,
  };
  // todo: error handling
  return (
    <>
      <GroupHeader group={group} />
      <Tabs defaultValue="chat" value={page}>
        <TabsList>
          <TabsTrigger value="chat">Chat</TabsTrigger>
          {id !== "_" ? (
            <>
              <TabsTrigger value="posts">Posts</TabsTrigger>
            </>
          ) : null}
          {/*<TabsTrigger value="articles">Articles</TabsTrigger>
           */}
          <TabsTrigger value="polls">Polls</TabsTrigger>
        </TabsList>
        <TabsContent asChild value="chat">
          <GroupChat key={groupId(group)} group={group} />
        </TabsContent>
        {id !== "_" ? (
          <>
            <TabsContent asChild value="posts">
              <GroupPosts key={groupId(group)} group={group} />
            </TabsContent>
          </>
        ) : null}
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

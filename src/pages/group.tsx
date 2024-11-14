import { useParams, useNavigate } from "react-router-dom";
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

type GroupTab = "chat" | "posts" | "polls";

export default function GroupPage({
  tab = "chat",
}: {
  tab?: GroupTab;
}) {
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
  return (
    <>
      <GroupHeader group={group} />
      <Tabs value={tab} onValueChange={onValueChange}>
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

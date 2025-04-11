import { useParams } from "react-router-dom";
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
import { CommunityChat } from "@/components/nostr/groups/chat";
import { useCommunity } from "@/lib/nostr/groups";
import type { Community, Group } from "@/lib/types";
import { GroupInfo } from "@/components/nostr/groups/info";
import Feed from "@/components/nostr/feed";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { BookmarkGroup } from "@/components/nostr/groups/bookmark";
import { CommunityEdit } from "@/components/nostr/groups/community-edit";
import { usePubkey } from "@/lib/account";
import Welcome from "@/components/nostr/groups/welcome";

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
        isCommunity: true,
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
          {isOwner && community ? (
            <CommunityEdit pubkey={pubkey} community={community} />
          ) : null}
          {group ? <BookmarkGroup group={group} /> : null}
          {group ? <GroupInfo group={group} /> : null}
        </div>
      </div>
    </Header>
  );
}

function Section({ group, kinds }: { group: Group; kinds: number[] }) {
  const filter = [
    {
      kinds: kinds,
      authors: [group.id],
      limit: 50,
    },
    {
      kinds: kinds,
      "#h": [group.id],
      limit: 50,
    },
  ];
  return (
    <div className="h-full p-2">
      <Feed
        group={group}
        filter={filter}
        live={false}
        onlyRelays={true}
        loadingClassname="py-32"
        emptyClassname="py-32"
      />
    </div>
  );
}

function CommunityContent({ pubkey }: { pubkey: string }) {
  const community = useCommunity(pubkey);
  const { t } = useTranslation();
  const userPubkey = usePubkey();
  const group = community
    ? {
        id: pubkey,
        relay: community.relay,
        isCommunity: true,
      }
    : null;

  return (
    <div>
      <CommunityHeader pubkey={pubkey} community={community} />
      <Tabs defaultValue={userPubkey ? "chat" : community ? "welcome" : "chat"}>
        <TabsList
          className="
          overflow-x-auto no-scrollbar 
	  w-[100vw]
md:w-[calc(100vw-16rem)]
	  group-has-[[data-collapsible=icon]]/sidebar-wrapper:w-[calc(100vw-18rem)"
        >
          {community ? (
            <TabsTrigger value="welcome">
              {t("content.type.welcome")}
            </TabsTrigger>
          ) : null}
          <TabsTrigger value="chat">{t("content.type.chat")}</TabsTrigger>
          {community && group ? (
            <>
              {community.sections?.map((section) => (
                <TabsTrigger key={section.name} value={section.name}>
                  {section.name}
                </TabsTrigger>
              ))}
            </>
          ) : null}
        </TabsList>
        {community ? (
          <TabsContent asChild value="welcome">
            <Welcome key={community.pubkey} community={community} />
          </TabsContent>
        ) : null}
        <TabsContent asChild value="chat">
          <CommunityChat pubkey={pubkey} />
        </TabsContent>
        {community && group ? (
          <>
            {community.sections?.map((section) => (
              <TabsContent key={section.name} value={section.name}>
                <Section
                  key={section.name}
                  group={group}
                  kinds={section.kinds}
                />
              </TabsContent>
            ))}
          </>
        ) : null}
      </Tabs>
    </div>
  );
}

export default function Community() {
  const { pubkey } = useParams();
  if (!pubkey) {
    return <Navigate to="/" />;
  }
  return <CommunityContent pubkey={pubkey} />;
}

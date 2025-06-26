import { useParams, useNavigate } from "react-router-dom";
import { Castle, Settings } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Header } from "@/components/header";
import { User } from "@/components/nostr/user";
import { Button } from "@/components/ui/button";
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
import { usePubkey } from "@/lib/account";
import Welcome from "@/components/nostr/groups/welcome";
import { NewPublication } from "@/components/nostr/targeted-publication";
import { TARGETED_PUBLICATION } from "@/lib/kinds";
import { LoadingScreen } from "@/components/loading-screen";
import { parseProfileIdentifier, resolveNip05 } from "@/lib/profile-identifier";

interface CommunityValidatorProps {
  identifier: string;
  onValidated: (pubkey: string, relays: string[]) => void;
  onError: (error: string) => void;
}

function CommunityValidator({
  identifier,
  onValidated,
  onError,
}: CommunityValidatorProps) {
  const { t } = useTranslation();

  useEffect(() => {
    async function parseIdentifier() {
      if (!identifier) {
        onError(t("community.error.no-identifier", "No identifier provided"));
        return;
      }

      const parsed = parseProfileIdentifier(identifier);
      if (!parsed) {
        onError(
          t("community.error.invalid-format", "Invalid identifier format"),
        );
        return;
      }

      if (parsed.type === "nip05") {
        // Resolve NIP-05 to pubkey
        const resolvedPubkey = await resolveNip05(parsed.pubkey);
        if (!resolvedPubkey) {
          onError(
            t(
              "community.error.nip05-resolve",
              "Could not resolve NIP-05 address",
            ),
          );
          return;
        }
        onValidated(resolvedPubkey, []); // Use discovery relays for NIP-05
      } else {
        onValidated(parsed.pubkey, parsed.relays);
      }
    }

    parseIdentifier();
  }, [identifier, onValidated, onError, t]);

  return <LoadingScreen />;
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
        isCommunity: true,
      }
    : null;
  const { t } = useTranslation();
  const navigate = useNavigate();
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
              <Castle className="size-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent>{t("group.metadata.community")}</TooltipContent>
          </Tooltip>
          <Separator orientation="vertical" className="ml-3 h-4" />
          {isOwner && community ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => navigate(`/c/${pubkey}/settings`)}
            >
              <Settings className="h-3.5 w-3.5" />
            </Button>
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
      limit: 20,
    },
    {
      kinds: [TARGETED_PUBLICATION],
      "#k": kinds.map((k) => k.toString()),
      "#h": [group.id],
      limit: 20,
    },
    {
      kinds: kinds,
      "#h": [group.id],
      limit: 20,
    },
  ];
  return (
    <div className="flex flex-col items-center justify-center gap-0 p-2 h-full">
      <NewPublication group={group} />
      <Feed
        group={group}
        filter={filter}
        live
        onlyRelays
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
	  w-[100dvw]
md:w-[calc(100dvw-18rem)]
         group-has-[[data-collapsible=icon]]/sidebar-wrapper:w-[calc(100dvw-18rem)"
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
  const { identifier } = useParams<{ identifier: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [pubkey, setPubkey] = useState<string | null>(null);
  const [, setRelays] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Reset state when identifier changes
  useEffect(() => {
    setPubkey(null);
    setRelays([]);
    setError(null);
  }, [identifier]);

  const handleValidated = (
    validatedPubkey: string,
    validatedRelays: string[],
  ) => {
    setPubkey(validatedPubkey);
    setRelays(validatedRelays);
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
  };

  // Redirect to home if no identifier
  if (!identifier) {
    return <Navigate to="/" />;
  }

  // Show error for identifier parsing errors
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">
            {t("community.not-found", "Community Not Found")}
          </h1>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => navigate(-1)}>
            {t("community.action.go-back", "Go Back")}
          </Button>
        </div>
      </div>
    );
  }

  // Show loading screen during identifier validation
  if (!pubkey && !error) {
    return (
      <CommunityValidator
        identifier={identifier}
        onValidated={handleValidated}
        onError={handleError}
      />
    );
  }

  // Render community content once we have a valid pubkey
  if (pubkey) {
    return <CommunityContent key={pubkey} pubkey={pubkey} />;
  }

  return null;
}

import {
  Navigate,
  useNavigate,
  useParams,
} from "react-router-dom";
import { Link } from "react-router-dom";
import {
  Server,
  Cog,
  Users,
  Contact,
  Code,
} from "lucide-react";
import { Header } from "@/components/header";
import { isRelayURL, useRelayInfo } from "@/lib/relay";
import { RelayIcon, RelayName } from "@/components/nostr/relay";
import Feed from "@/components/nostr/feed";
import { FeedControls, ActiveFilterBadges } from "@/components/nostr/feed-controls";
import { User } from "@/components/nostr/user";
import { useFeedFilters } from "@/hooks/use-feed-filters";
import {
  NDKKind,
  NDKRelaySet,
  NDKSubscriptionCacheUsage,
} from "@nostr-dev-kit/ndk";
import { GroupChat } from "@/components/nostr/groups/chat";
import { t } from "i18next";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/nav-tabs";
import { useTranslation } from "react-i18next";
import { getNipInfo } from "@/lib/constants/nips";
import { NameList } from "@/components/nostr/name-list";
import { InputCopy } from "@/components/ui/input-copy";
import { COMMUNIKEY } from "@/lib/kinds";
import { useNDK } from "@/lib/ndk";
import { useQuery } from "@tanstack/react-query";

// todo: searchable group list if relay supports nip 29

function RelayGroups({ relay }: { relay: string }) {
  const filter = {
    kinds: [NDKKind.GroupMetadata],
  };
  return (
    <Feed
      filter={filter}
      outboxRelays={[relay]}
      onlyRelays
      live={false}
      showReactions={false}
      loadingClassname="py-32"
      emptyClassname="py-32"
    />
  );
}

function RelayCommunities({ relay }: { relay: string }) {
  const filter = {
    kinds: [COMMUNIKEY],
  };
  return (
    <Feed
      filter={filter}
      outboxRelays={[relay]}
      onlyRelays
      live={false}
      showReactions={false}
      loadingClassname="py-32"
      emptyClassname="py-32"
    />
  );
}

function useRelayUsers(relay: string) {
  const ndk = useNDK();
  const filter = {
    kinds: [NDKKind.RelayList],
    "#r": [relay],
  };
  return useQuery({
    queryKey: ["relay-users", relay],
    queryFn: async () => {
      const events = await ndk.fetchEvents(
        filter,
        {
          closeOnEose: true,
          cacheUsage: NDKSubscriptionCacheUsage.ONLY_RELAY,
        },
        NDKRelaySet.fromRelayUrls([relay], ndk),
      );
      const users = Array.from(
        new Set(Array.from(events).map((e) => e.pubkey)),
      );
      return users;
    },
    staleTime: Infinity,
  });
}

function RelayUsers({ relay }: { relay: string }) {
  const { data: users } = useRelayUsers(relay);
  if (!users) {
    return null;
  }
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Users className="size-4 text-muted-foreground" />
        <h2 className="text-sm uppercase text-muted-foreground">
          {t("relay.users")}
        </h2>
      </div>
      <NameList pubkeys={users} suffix={t("relay.use-this-relay")} />
    </div>
  );
}

function RelayInfo({ relay }: { relay: string }) {
  const { data: info } = useRelayInfo(relay);
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-center">
      <div className="flex flex-col gap-4 p-2 max-w-xl">
        {info?.banner || info?.icon ? (
          <img
            src={info?.banner || info?.icon}
            alt={info?.name}
            className="w-full max-h-96 aspect-image object-cover"
          />
        ) : null}

        <div className="flex flex-col gap-2">
          <h1 className="text-xl font-normal leading-none">{info?.name}</h1>
          <p className="text-md text-muted-foreground">{info?.description}</p>
        </div>

        <InputCopy value={relay} />

        {info?.contact ? (
          <div className="flex flex-col gap-2">
            <div className="flex flex-row gap-2 items-center">
              <Contact className="size-4 text-muted-foreground" />
              <h2 className="text-sm uppercase text-muted-foreground">
                {t("relay.contact")}
              </h2>
            </div>
            {info?.contact.length === 64 ? ( // todo: check if pubkey
              <User
                pubkey={info.contact}
                classNames={{
                  avatar: "size-5",
                  name: "text-sm",
                }}
              />
            ) : (
              <p className="text-sm">{info?.contact}</p>
            )}
          </div>
        ) : null}

        {info?.software ? (
          <div className="flex flex-col gap-2">
            <div className="flex flex-row gap-2 items-center">
              <Code className="size-4 text-muted-foreground" />
              <h2 className="text-sm uppercase text-muted-foreground">
                {t("relay.software")}
              </h2>
            </div>
            <p className="text-sm font-mono">{info?.software}</p>
          </div>
        ) : null}

        <RelayUsers relay={relay} />

        {info?.supported_nips && info.supported_nips.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Cog className="size-4 text-muted-foreground" />
              <h2 className="text-sm uppercase text-muted-foreground">
                {t("relay.supported-nips")}
              </h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {info.supported_nips.map((nip) => {
                const nipInfo = getNipInfo(`${nip < 10 ? "0" : ""}${nip}`);
                return nipInfo ? (
                  <Link
                    to={`https://github.com/nostr-protocol/nips/blob/master/${nipInfo ? nipInfo.nip : nip}.md`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline hover:decoration-dotted"
                    key={nip}
                  >
                    <div className="flex items-center gap-2 p-2 rounded-md bg-muted/40">
                      <span className="text-muted-foreground">
                        {nipInfo.icon}
                      </span>
                      <span className="text-sm line-clamp-1">
                        {t(nipInfo.translationKey)}
                      </span>
                    </div>
                  </Link>
                ) : null;
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function RelayFeed({ relay }: { relay: string }) {
  const limit = 20;
  const {
    kinds,
    tempKinds,
    live,
    filterChanged,
    isPopoverOpen,
    setIsPopoverOpen,
    handleLiveChange,
    handleKindToggle,
    handleClearKinds,
    handleSelectAllKinds,
    handleSaveFilters,
    handleRemoveKind,
  } = useFeedFilters({ defaultKinds: [NDKKind.Text] });

  if (!relay) {
    return <Navigate to="/" />;
  }

  return (
    <div className="flex flex-col gap-0 max-w-xl mx-auto">
      <div className="mb-4">
        <FeedControls
          kinds={kinds}
          tempKinds={tempKinds}
          live={live}
          filterChanged={filterChanged}
          isPopoverOpen={isPopoverOpen}
          setIsPopoverOpen={setIsPopoverOpen}
          onLiveChange={handleLiveChange}
          onKindToggle={handleKindToggle}
          onClearKinds={handleClearKinds}
          onSelectAllKinds={handleSelectAllKinds}
          onSaveFilters={handleSaveFilters}
        />
        <ActiveFilterBadges
          kinds={kinds}
          onRemoveKind={handleRemoveKind}
        />
      </div>

      <Feed
        feedClassName="p-0"
        key={`${relay}-${kinds.join(",")}`}
        filter={{ kinds, limit }}
        outboxRelays={[relay]}
        live={live}
        onlyRelays
        slidingWindow={limit}
        loadingClassname="py-32"
        emptyClassname="py-32"
        loadOlder
      />
    </div>
  );
}

type RelayTab = "info" | "feed" | "chat" | "groups" | "communities";

function RelayPage({ relay, tab = "info" }: { relay: string; tab?: RelayTab }) {
  const { data: info } = useRelayInfo(relay);
  const navigate = useNavigate();
  const supportsNip29 = info?.supported_nips
    ?.map((n) => String(n))
    .includes("29");
  const group = {
    relay,
    id: "_",
  };

  function onValueChange(value: string) {
    if (value === "info") {
      navigate(`/relay/${encodeURIComponent(relay)}`);
    } else {
      navigate(`/relay/${encodeURIComponent(relay)}/${value}`);
    }
  }
  return (
    <div className="flex flex-col" key={relay}>
      <Header>
        <div className="flex flex-row justify-between items-center w-full">
          <div className="flex flex-row gap-2 items-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <RelayIcon relay={relay} className="size-8" />
              </TooltipTrigger>
              <TooltipContent>{t("relay.info")}</TooltipContent>
            </Tooltip>
            <div className="flex flex-col gap-0">
              <h1 className="text-lg font-normal leading-none">
                <RelayName relay={relay} />
              </h1>
            </div>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Server className="size-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent>{t("relay.info")}</TooltipContent>
          </Tooltip>
        </div>
      </Header>
      <Tabs value={tab} onValueChange={onValueChange}>
        <TabsList>
          <TabsTrigger value="info">{t("relay.info")}</TabsTrigger>
          <TabsTrigger value="feed">{t("relay.feed")}</TabsTrigger>
          <TabsTrigger value="chat">{t("relay.chat")}</TabsTrigger>
          {supportsNip29 ? (
            <TabsTrigger value="groups">{t("relay.groups")}</TabsTrigger>
          ) : null}
          <TabsTrigger value="communities">
            {t("relay.communities")}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="info">
          <RelayInfo relay={relay} />
        </TabsContent>
        <TabsContent value="feed">
          <RelayFeed relay={relay} />
        </TabsContent>
        <TabsContent value="chat">
          <GroupChat group={group} />
        </TabsContent>
        <TabsContent value="groups">
          <RelayGroups relay={relay} />
        </TabsContent>
        <TabsContent value="communities">
          <RelayCommunities relay={relay} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function Relay({ tab = "info" }: { tab?: RelayTab }) {
  const { relay: relayUrl } = useParams();

  if (!relayUrl) {
    return <Navigate to="/" />;
  }

  const relay =
    relayUrl.startsWith("ws://") || relayUrl.startsWith("wss://")
      ? relayUrl
      : `wss://${relayUrl}`;

  if (!isRelayURL(relay)) {
    return <Navigate to="/" />;
  }

  return <RelayPage relay={relay} tab={tab} />;
}

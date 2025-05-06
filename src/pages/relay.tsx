import {
  Navigate,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { Link } from "react-router-dom";
import {
  Server,
  Filter,
  Radio,
  Save,
  Cog,
  Users,
  Contact,
  Code,
} from "lucide-react";
import { Header } from "@/components/header";
import { isRelayURL, useRelayInfo } from "@/lib/relay";
import { RelayIcon, RelayName } from "@/components/nostr/relay";
import { Button } from "@/components/ui/button";
import Feed from "@/components/nostr/feed";
import { User } from "@/components/nostr/user";
import {
  SupportedKinds,
  ContentKinds,
  getKindInfo,
} from "@/lib/constants/kinds";
import { useState, useEffect } from "react";
import {
  NDKKind,
  NDKRelaySet,
  NDKSubscriptionCacheUsage,
} from "@nostr-dev-kit/ndk";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  const [searchParams, setSearchParams] = useSearchParams({
    kinds: [String(NDKKind.Text)],
    live: "true",
  });
  const defaultKinds = searchParams
    .getAll("kinds")
    .map(Number)
    .filter((k) => SupportedKinds.includes(k));
  const defaultLive = searchParams.get("live") === "true";

  const [kinds, setKinds] = useState<NDKKind[]>(defaultKinds);
  const [tempKinds, setTempKinds] = useState<NDKKind[]>(defaultKinds);
  const [live, setLive] = useState(defaultLive);
  const [filterChanged, setFilterChanged] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  useEffect(() => {
    setTempKinds(kinds);
  }, [kinds]);

  useEffect(() => {
    const hasChanged =
      JSON.stringify(tempKinds.sort()) !== JSON.stringify(kinds.sort());
    setFilterChanged(hasChanged);
  }, [tempKinds, kinds]);

  if (!relay) {
    return <Navigate to="/" />;
  }

  function handleLiveChange(checked: boolean) {
    setLive(checked);
    setSearchParams(
      {
        kinds: kinds.map(String),
        live: checked.toString(),
      },
      {
        replace: true,
      },
    );
  }

  const handleKindToggle = (kind: NDKKind, checked: boolean) => {
    if (checked) {
      setTempKinds((prev) => [...prev, kind]);
    } else {
      setTempKinds((prev) => prev.filter((k) => k !== kind));
    }
  };

  const handleClearKinds = () => {
    setTempKinds([]);
  };

  const handleSelectAllKinds = () => {
    setTempKinds(SupportedKinds);
  };

  const handleSaveFilters = () => {
    setKinds(tempKinds);
    setIsPopoverOpen(false);
    setSearchParams(
      {
        kinds: tempKinds.map(String),
        live: live.toString(),
      },
      {
        replace: true,
      },
    );
  };

  return (
    <div className="flex flex-col gap-0 max-w-xl mx-auto">
      <div className="flex flex-row gap-4 items-start justify-between pt-2 w-full px-4 sm:px-8">
        <div>
          <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Filter className="size-4" />
                {kinds.length > 0 && (
                  <Badge variant="counter" className="ml-1">
                    {kinds.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium">{t("feed.content-types")}</h4>
                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      size="tiny"
                      onClick={handleClearKinds}
                    >
                      {t("feed.clear")}
                    </Button>
                    <Button
                      variant="outline"
                      size="tiny"
                      onClick={handleSelectAllKinds}
                    >
                      {t("feed.all")}
                    </Button>
                  </div>
                </div>

                <ScrollArea className="h-[300px] pr-3">
                  <div className="flex flex-col gap-2">
                    {ContentKinds.map((kindInfo) => (
                      <div
                        key={kindInfo.kind}
                        className="flex items-center space-x-2"
                      >
                        <Checkbox
                          id={`kind-${kindInfo.kind}`}
                          checked={tempKinds.includes(kindInfo.kind)}
                          onCheckedChange={(checked) =>
                            handleKindToggle(kindInfo.kind, checked === true)
                          }
                        />
                        <Label
                          htmlFor={`kind-${kindInfo.kind}`}
                          className="flex items-center gap-2 text-sm cursor-pointer"
                        >
                          <span className="text-muted-foreground">
                            {kindInfo.icon}
                          </span>
                          {t(kindInfo.translationKey)}
                        </Label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                <div className="flex justify-end">
                  <Button
                    onClick={handleSaveFilters}
                    disabled={!filterChanged}
                    size="sm"
                  >
                    <Save />
                    {t("feed.save")}
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {kinds.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 w-full max-w-lg mx-auto mt-2 mb-4">
              {kinds.map((kind) => {
                const kindInfo = getKindInfo(kind);
                return (
                  <Badge
                    key={kind}
                    variant="outline"
                    className="flex items-center gap-1.5 py-1"
                  >
                    {kindInfo ? (
                      <>
                        <span className="text-muted-foreground">
                          {kindInfo.icon}
                        </span>
                        <span className="text-xs">
                          {t(kindInfo.translationKey)}
                        </span>
                      </>
                    ) : (
                      <span className="text-xs">{kind}</span>
                    )}
                  </Badge>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Label htmlFor="live-mode" className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Radio className="size-5" />
              </TooltipTrigger>
              <TooltipContent>{t("feed.live-updates")}</TooltipContent>
            </Tooltip>
          </Label>
          <Switch
            aria-label={t("feed.live-updates")}
            id="live-mode"
            checked={live}
            onCheckedChange={handleLiveChange}
          />
        </div>
      </div>

      <Feed
        feedClassName="p-0"
        key={`${relay}-${kinds.join(",")}`}
        filter={{ kinds, limit }}
        outboxRelays={[relay!]}
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

type RelayTab = "info" | "feed" | "groups" | "communities";

export default function Relay({ tab = "info" }: { tab?: RelayTab }) {
  const { relay } = useParams();
  const { data: info } = useRelayInfo(relay!);
  const navigate = useNavigate();
  const supportsNip29 = info?.supported_nips
    ?.map((n) => String(n))
    .includes("29");

  if (!relay || !isRelayURL(relay)) {
    return <Navigate to="/" />;
  }

  function onValueChange(value: string) {
    if (value === "info") {
      navigate(`/relay/${encodeURIComponent(relay!)}`);
    } else {
      navigate(`/relay/${encodeURIComponent(relay!)}/${value}`);
    }
  }
  return (
    <div className="flex flex-col" key={relay}>
      <Header>
        <div className="flex flex-row justify-between items-center w-full">
          <div className="flex flex-row gap-2 items-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <RelayIcon relay={relay!} className="size-8" />
              </TooltipTrigger>
              <TooltipContent>{t("relay.info")}</TooltipContent>
            </Tooltip>
            <div className="flex flex-col gap-0">
              <h1 className="text-lg font-normal leading-none">
                <RelayName relay={relay!} />
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
          {supportsNip29 ? (
            <TabsTrigger value="groups">{t("relay.groups")}</TabsTrigger>
          ) : null}
          <TabsTrigger value="communities">
            {t("relay.communities")}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="info">
          <RelayInfo relay={relay!} />
        </TabsContent>
        <TabsContent value="feed">
          <RelayFeed relay={relay!} />
        </TabsContent>
        <TabsContent value="groups">
          <RelayGroups relay={relay!} />
        </TabsContent>
        <TabsContent value="communities">
          <RelayCommunities relay={relay!} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

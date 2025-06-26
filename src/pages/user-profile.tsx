import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  User as UserIcon,
  AtSign,
  LinkIcon,
  Users,
  Castle,
  Zap,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { parseProfileIdentifier, resolveNip05 } from "@/lib/profile-identifier";
import { useProfile, useRelayList, useAddress } from "@/lib/nostr";
import { NewZapDialog } from "@/components/nostr/zap";
import { useUserGroups } from "@/lib/nostr/groups";
import { COMMUNIKEY } from "@/lib/kinds";
import { Header } from "@/components/header";
import { User } from "@/components/nostr/user";
import { RichText } from "@/components/rich-text";
import { Nip05 } from "@/components/nostr/nip05";
import { LoadingScreen } from "@/components/loading-screen";
import { Group } from "@/components/nostr/group";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/nav-tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import Feed from "@/components/nostr/feed";
import {
  FeedControls,
  ActiveFilterBadges,
} from "@/components/nostr/feed-controls";
import { NDKKind } from "@nostr-dev-kit/ndk";
import { useFeedFilters } from "@/hooks/use-feed-filters";
import { ProfileColor } from "@/components/nostr/profile";
import Banner from "@/components/banner";

interface ProfileValidatorProps {
  identifier: string;
  onValidated: (pubkey: string, relays: string[]) => void;
  onError: (error: string) => void;
}

function ProfileValidator({
  identifier,
  onValidated,
  onError,
}: ProfileValidatorProps) {
  const { t } = useTranslation();

  useEffect(() => {
    async function parseIdentifier() {
      if (!identifier) {
        onError(t("profile.error.no-identifier", "No identifier provided"));
        return;
      }

      const parsed = parseProfileIdentifier(identifier);
      if (!parsed) {
        onError(t("profile.error.invalid-format", "Invalid identifier format"));
        return;
      }

      if (parsed.type === "nip05") {
        // Resolve NIP-05 to pubkey
        const resolvedPubkey = await resolveNip05(parsed.pubkey);
        if (!resolvedPubkey) {
          onError(
            t(
              "profile.error.nip05-resolve",
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

function ProfileHeader({ pubkey }: { pubkey: string }) {
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
        <Tooltip>
          <TooltipTrigger>
            <UserIcon className="size-5 text-muted-foreground" />
          </TooltipTrigger>
          <TooltipContent>{t("user.profile", "Profile")}</TooltipContent>
        </Tooltip>
      </div>
    </Header>
  );
}

function ProfileWelcome({
  pubkey,
  relays,
}: {
  pubkey: string;
  relays: string[];
}) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const { data: profile } = useProfile(pubkey, relays);
  const { data: userRelays } = useRelayList(pubkey);
  const { data: userGroups = [] } = useUserGroups(pubkey);

  // Filter to only show NIP-29 groups (exclude communities)
  const nip29Groups = userGroups.filter((group) => !group.isCommunity);

  // Check if this user is a communikey (has COMMUNIKEY event)
  const { data: communikeyEvent } = useAddress({
    pubkey,
    kind: COMMUNIKEY,
    relays: [...relays, ...(userRelays || [])],
  });

  const banner = profile?.banner || profile?.picture;

  return (
    <div className="flex items-center justify-center px-1">
      <div className="flex flex-col relative w-full max-w-lg">
        <Banner imgSrc={banner} />

        {/* Banner, Avatar and Action Buttons Section */}
        <div className="flex flex-row justify-between items-center -mt-16">
          <div className="pl-2 flex items-end">
            <User
              notClickable
              pubkey={pubkey}
              classNames={{
                avatar: `size-32 border-4 border-background`,
                name: "hidden",
                wrapper: "flex-row gap-3 items-end",
              }}
            />
          </div>

          {/* Action Buttons - now positioned independently */}
          <div className="flex flex-row gap-2 -mb-11">
            {/* Zap Button - only show if user can receive zaps */}
            {profile?.lud16 && (
              <NewZapDialog
                pubkey={pubkey}
                zapType="nip-61"
                trigger={
                  <Button variant="default" size="sm">
                    <Zap className="size-4" />
                    <span className="hidden sm:inline ml-2">
                      {t("zap.action.zap", "Zap")}
                    </span>
                  </Button>
                }
              />
            )}
            {/* Communikey Button */}
            {communikeyEvent && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/c/${pubkey}`)}
              >
                <Castle className="size-4" />
                <span className="hidden sm:inline ml-2">
                  {t("user.community", "Community")}
                </span>
              </Button>
            )}
          </div>
        </div>

        {/* Name, Description, Website Section */}
        <div className="px-2 pb-2 flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <div className="flex flex-col gap-0">
              <User
                notClickable
                pubkey={pubkey}
                classNames={{
                  avatar: "hidden",
                  name: "text-4xl",
                  wrapper: "flex-col gap-0 items-start",
                }}
              />
              <ProfileColor pubkey={pubkey} relays={relays} />
            </div>
            {profile?.about && (
              <RichText
                tags={profile?.tags}
                className="text-balance text-muted-foreground mt-2"
              >
                {profile.about}
              </RichText>
            )}
          </div>

          {(profile?.website || profile?.nip05) && (
            <div className="flex flex-col items-start gap-1">
              {profile?.website && (
                <a
                  href={profile.website}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <div className="flex flex-row items-center gap-1 px-2">
                    <LinkIcon className="flex-shrink-0 size-3 text-muted-foreground" />
                    <span className="break-all line-clamp-1 font-mono text-xs hover:underline hover:decoration-dotted">
                      {profile.website}
                    </span>
                  </div>
                </a>
              )}
              {profile?.nip05 && (
                <span className="font-mono text-xs px-2">
                  <div className="flex flex-row items-center gap-1">
                    <AtSign className="size-3 text-muted-foreground" />
                    <Nip05 pubkey={pubkey} />
                  </div>
                </span>
              )}
            </div>
          )}
        </div>
        <div className="px-2 pt-1 pb-6 flex flex-col gap-4">
          {/* TODO: communikeys section */}
          {/* NIP-29 Groups Section */}
          {nip29Groups.length > 0 ? (
            <div className="flex flex-col gap-2">
              <div className="flex flex-row items-center gap-1">
                <Users className="size-4 text-muted-foreground" />
                <h2 className="text-sm font-light uppercase text-muted-foreground">
                  {t("profile.groups", "Groups")}
                </h2>
              </div>
              <div className="flex flex-col gap-4">
                {nip29Groups.map((group) => (
                  <Group key={`${group.id}:${group.relay}`} group={group} />
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex flex-row items-center gap-1">
                <Users className="size-4 text-muted-foreground" />
                <h2 className="text-sm font-light uppercase text-muted-foreground">
                  {t("profile.groups", "Groups")}
                </h2>
              </div>
              <div className="text-sm text-muted-foreground">
                {t("profile.groups.none", "No groups found")}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ProfileFeed({ pubkey, relays }: { pubkey: string; relays: string[] }) {
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

  const limit = 20;
  const filter = {
    authors: [pubkey],
    kinds: kinds.length > 0 ? kinds : undefined,
    limit,
  };

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
        <ActiveFilterBadges kinds={kinds} onRemoveKind={handleRemoveKind} />
      </div>
      <Feed
        feedClassName="p-0"
        key={`${pubkey}-${kinds.join(",")}-${live}`}
        filter={filter}
        live={live}
        outboxRelays={relays}
        onlyRelays={relays.length > 0}
        slidingWindow={limit}
        loadingClassname="py-32"
        emptyClassname="py-32"
        loadOlder
      />
    </div>
  );
}

interface ProfileContentProps {
  pubkey: string;
  relays: string[];
  tab?: string;
}

function ProfileContent({
  pubkey,
  relays,
  tab = "profile",
}: ProfileContentProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { identifier } = useParams<{ identifier: string }>();

  const { data: profile, isError: isProfileError } = useProfile(pubkey, relays);
  const { data: userRelays } = useRelayList(pubkey);

  // Show error only after we've tried to fetch the profile and it failed
  if (!profile && isProfileError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">
            {t("profile.not-found", "Profile Not Found")}
          </h1>
          <p className="text-muted-foreground mb-4">
            {t(
              "profile.error.load-failed",
              "This user profile could not be loaded",
            )}
          </p>
          <Button onClick={() => navigate(-1)}>
            {t("profile.action.go-back", "Go Back")}
          </Button>
        </div>
      </div>
    );
  }

  const handleTabChange = (value: string) => {
    if (value === "profile") {
      navigate(`/p/${identifier}`);
    } else {
      navigate(`/p/${identifier}/${value}`);
    }
  };

  return (
    <div>
      <ProfileHeader pubkey={pubkey} />
      <Tabs value={tab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="profile">
            {t("user.profile", "Profile")}
          </TabsTrigger>
          <TabsTrigger value="feed">
            {t("content.type.feed", "Feed")}
          </TabsTrigger>
        </TabsList>
        <TabsContent asChild value="profile">
          <ProfileWelcome pubkey={pubkey} relays={relays} />
        </TabsContent>
        <TabsContent asChild value="feed">
          <ProfileFeed pubkey={pubkey} relays={userRelays || relays} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function UserProfile({ tab = "profile" }: { tab?: string }) {
  const { identifier } = useParams<{ identifier: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [pubkey, setPubkey] = useState<string | null>(null);
  const [relays, setRelays] = useState<string[]>([]);
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

  // Show error for identifier parsing errors
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">
            {t("profile.not-found", "Profile Not Found")}
          </h1>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => navigate(-1)}>
            {t("profile.action.go-back", "Go Back")}
          </Button>
        </div>
      </div>
    );
  }

  // Show loading screen during identifier validation
  if (!pubkey && !error) {
    return (
      <ProfileValidator
        identifier={identifier || ""}
        onValidated={handleValidated}
        onError={handleError}
      />
    );
  }

  // Render profile content once we have a valid pubkey
  if (pubkey) {
    return (
      <ProfileContent key={pubkey} pubkey={pubkey} relays={relays} tab={tab} />
    );
  }

  return null;
}

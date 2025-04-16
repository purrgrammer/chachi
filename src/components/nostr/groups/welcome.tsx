import {
  AppWindow,
  AtSign,
  Check,
  LinkIcon,
  MessageSquare,
  Pin,
  Server,
  CloudUpload,
  Landmark,
  MapPin,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Embed } from "@/components/nostr/detail";
import { User } from "@/components/nostr/user";
import { ARef } from "@/components/nostr/event";
import { useRecommendedApps } from "@/lib/nip-89";
import { RichText } from "@/components/rich-text";
import { Nip05 } from "@/components/nostr/nip05";
import { Login } from "@/components/nostr/login";
import { usePinnedPosts } from "@/lib/nip-51";
import { useProfile, useRelayList, useTag } from "@/lib/nostr";
import { Community } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { useMyGroups } from "@/lib/groups";
import { RelayLink } from "../relay";
import { BlossomLink } from "@/components/blossom";
import { MintLink } from "@/components/mint";
import { Badge } from "@/components/ui/badge";
import { ContentKinds } from "@/lib/constants/kinds";
import { useState, useMemo } from "react";
import { usePubkey } from "@/lib/account";
import { toast } from "sonner";
import { useBookmarkGroup } from "./bookmark";
import Geohash from "latlon-geohash";

function PinnedPost({ tag, relays }: { tag: string[]; relays: string[] }) {
  const { data: post } = useTag(tag);
  return post ? (
    <Embed event={post} relays={relays} showReactions={false} />
  ) : null;
}

export default function Welcome({ community }: { community: Community }) {
  const { t } = useTranslation();
  const { data: profile } = useProfile(community.pubkey);
  const { data: userRelays } = useRelayList(community.pubkey);
  const myGroups = useMyGroups();
  const [isBannerLoaded, setIsBannerLoaded] = useState(false);
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const pubkey = usePubkey();
  const isMember = myGroups.some(
    (group) => group.isCommunity && group.id === community.pubkey,
  );
  const { bookmarkGroup } = useBookmarkGroup({
    id: community.pubkey,
    relay: community.relay,
    isCommunity: true,
  });
  const relays = Array.from(
    new Set([
      community.relay,
      ...(community.backupRelays
        ? community.backupRelays
        : userRelays
          ? userRelays
          : []),
    ]),
  );
  const description = community.description || profile?.about;
  const { data: pinned = [] } = usePinnedPosts(community.pubkey, relays);
  const { data: apps = [] } = useRecommendedApps(community.pubkey, relays);
  const banner = profile?.banner || profile?.picture;

  // Get all unique kinds from all sections
  const allKinds = Array.from(
    new Set(community.sections?.flatMap((section) => section.kinds) || []),
  );

  // Logic to generate Google Maps URL
  const mapUrl = useMemo(() => {
    const location = community.location;
    const geohash = community.geohash;

    if (location) {
      // If human-readable location exists, use it as the search query
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
    } else if (geohash) {
      try {
        // If only geohash exists, decode it to lat/lon
        const { lat, lon } = Geohash.decode(geohash);
        // Use lat,lon for a precise point marker
        return `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
      } catch (error) {
        console.error("Failed to decode geohash for map link:", error);
        // Fallback to searching the raw geohash if decoding fails
        return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(geohash)}`;
      }
    }
    return null;
  }, [community.location, community.geohash]);

  const handleJoinClick = async () => {
    if (!pubkey) {
      setShowLoginDialog(true);
      return;
    }

    try {
      await bookmarkGroup();
      toast.success(
        t("group.bookmark.success", "Group bookmarked successfully"),
      );
    } catch (error) {
      console.error("Error bookmarking group:", error);
      toast.error(t("group.bookmark.error", "Failed to bookmark group"));
    }
  };

  return (
    <div className="flex items-center justify-center">
      <div className="flex flex-col relative w-full max-w-4xl max-h-96">
        {banner && (
          <img
            src={banner}
            alt="Banner"
            className="w-full min-h-42 max-h-96 aspect-image object-cover"
            onLoad={() => setIsBannerLoaded(true)}
          />
        )}
        <div
          className={`flex flex-row justify-between ${isBannerLoaded ? "-mt-20" : ""}`}
        >
          <div className="p-2 flex flex-col items-start gap-3">
            <div className="flex flex-col gap-2 items-start ml-3">
              <div className="flex flex-col gap-1">
                <User
                  notClickable
                  pubkey={community.pubkey}
                  classNames={{
                    avatar: "size-32 border-4 border-background",
                    name: "text-4xl",
                    wrapper: "flex-col gap-0 items-start",
                  }}
                />
                {description ? (
                  <RichText
                    tags={profile?.tags}
                    className="text-balance text-muted-foreground"
                  >
                    {description}
                  </RichText>
                ) : null}
              </div>
              {allKinds.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {allKinds.map((kind) => {
                    const kindInfo = ContentKinds.find((k) => k.kind === kind);
                    return kindInfo ? (
                      <Badge
                        key={kind}
                        variant="secondary"
                        className="text-xs flex items-center gap-1"
                      >
                        {kindInfo.icon}
                        <span>{t(kindInfo.translationKey)}</span>
                      </Badge>
                    ) : null;
                  })}
                </div>
              )}
            </div>
            {profile?.website ||
            profile?.nip05 ||
            community.location ||
            community.geohash ? (
              <div className="px-2 flex flex-col items-start gap-1">
                {mapUrl ? (
                  <Link
                    to={mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-xs px-2 hover:underline hover:decoration-dotted"
                  >
                    <div className="flex flex-row items-center gap-1">
                      <MapPin className="size-3 text-muted-foreground" />
                      {community.location ? (
                        <span className="font-mono">{community.location}</span>
                      ) : (
                        <span className="font-mono">{community.geohash}</span>
                      )}
                    </div>
                  </Link>
                ) : null}
                {profile?.website ? (
                  <Link
                    to={profile.website}
                    className="font-mono text-xs px-2 hover:underline hover:decoration-dotted"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <div className="flex flex-row items-center gap-1">
                      <LinkIcon className="size-3 text-muted-foreground" />
                      {profile.website}
                    </div>
                  </Link>
                ) : null}
                {profile?.nip05 ? (
                  <span className="font-mono text-xs px-2">
                    <div className="flex flex-row items-center gap-1">
                      <AtSign className="size-3 text-muted-foreground" />
                      <Nip05 pubkey={profile.pubkey} />
                    </div>
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
          <div className="flex flex-row gap-2 mt-20 pt-2 pr-3">
            {isMember ? (
              <Button disabled variant="outline" size="sm">
                <Check className="size-4 text-green-500 dark:text-green-400" />
                {t("groups.welcome.joined")}
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={handleJoinClick}>
                <MessageSquare className="size-4" />
                {t("groups.welcome.join")}
              </Button>
            )}
          </div>
        </div>
        <div className="px-6 pt-2 flex flex-col gap-4">
          {pinned.length > 0 ? (
            <div className="flex flex-col gap-2">
              <div className="flex flex-row items-center gap-1">
                <Pin className="size-4 text-muted-foreground" />
                <h2 className="text-sm font-light uppercase text-muted-foreground">
                  {t("groups.welcome.pinned-posts")}
                </h2>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                {pinned.map((tag) => (
                  <PinnedPost key={tag[1]} tag={tag} relays={relays} />
                ))}
              </div>
            </div>
          ) : null}
          {apps.length > 0 ? (
            <div className="flex flex-col gap-2">
              <div className="flex flex-row items-center gap-1">
                <AppWindow className="size-4 text-muted-foreground" />
                <h2 className="text-sm font-light uppercase text-muted-foreground">
                  {t("groups.welcome.apps")}
                </h2>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                {apps.map(({ address }) => (
                  <ARef
                    key={address}
                    address={address}
                    relays={relays}
                    showReactions={false}
                  />
                ))}
              </div>
            </div>
          ) : null}
          {relays.length > 0 ? (
            <div className="flex flex-col gap-2">
              <div className="flex flex-row items-center gap-1">
                <Server className="size-4 text-muted-foreground" />
                <h2 className="text-sm font-light uppercase text-muted-foreground">
                  {t("groups.welcome.relays")}
                </h2>
              </div>
              <div className="flex flex-col gap-2">
                {relays.map((relay) => (
                  <RelayLink
                    key={relay}
                    relay={relay}
                    classNames={{ icon: "size-4", name: "text-sm" }}
                  />
                ))}
              </div>
            </div>
          ) : null}
          {community.blossom && community.blossom.length > 0 ? (
            <div className="flex flex-col gap-2">
              <div className="flex flex-row items-center gap-1">
                <CloudUpload className="size-4 text-muted-foreground" />
                <h2 className="text-sm font-light uppercase text-muted-foreground">
                  {t("groups.welcome.blossom")}
                </h2>
              </div>
              <div className="flex flex-col gap-2">
                {community.blossom.map((blossom) => (
                  <BlossomLink
                    key={blossom}
                    url={blossom}
                    classNames={{ icon: "size-4", name: "text-sm" }}
                  />
                ))}
              </div>
            </div>
          ) : null}
          {community.mint ? (
            <div className="flex flex-col gap-2">
              <div className="flex flex-row items-center gap-1">
                <Landmark className="size-4 text-muted-foreground" />
                <h2 className="text-sm font-light uppercase text-muted-foreground">
                  {t("groups.welcome.mint")}
                </h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <MintLink
                  url={community.mint}
                  classNames={{ icon: "size-4", name: "text-sm" }}
                />
              </div>
            </div>
          ) : null}
        </div>
      </div>
      {showLoginDialog && <Login trigger={<></>} isCompact={false} />}
    </div>
  );
}

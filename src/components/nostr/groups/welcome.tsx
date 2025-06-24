import {
  AppWindow,
  AtSign,
  Check,
  LinkIcon,
  MessageSquare,
  Pin,
  HandHeart,
  Server,
  CloudUpload,
  Landmark,
  MapPin,
  Zap,
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
import { NewZapDialog } from "@/components/nostr/zap";
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
import { ProfileColor } from "@/components/nostr/profile";
import { useSupporters } from "@/lib/nostr/zaps";
import Geohash from "latlon-geohash";
import Amount from "@/components/amount";
import Banner from "@/components/banner";

function PinnedPost({ tag, relays }: { tag: string[]; relays: string[] }) {
  const { data: post } = useTag(tag);
  return post ? (
    <Embed event={post} relays={relays} showReactions={false} />
  ) : null;
}

function Supporters({
  community,
  relays,
}: {
  community: Community;
  relays: string[];
}) {
  const { t } = useTranslation();
  const supporters = useSupporters(community.pubkey, relays);
  return supporters.length > 0 ? (
    <div className="flex flex-col gap-2">
      <div className="flex flex-row items-center gap-1">
        <HandHeart className="size-4 text-muted-foreground" />
        <h2 className="text-sm font-light uppercase text-muted-foreground">
          {t("groups.welcome.supporters")}
        </h2>
      </div>
      <div className="flex flex-col gap-0">
        {supporters.slice(0, 3).map(([pk, amount]) => (
          <div className="flex w-full flex-row items-center justify-between">
            <User
              key={pk}
              pubkey={pk}
              classNames={{
                avatar: "size-5",
                name: "text-md font-normal hover:underline hover:decoration-dotted",
              }}
              clickAction="link"
            />
            <Amount amount={amount} currency="sat" />
          </div>
        ))}
      </div>
    </div>
  ) : null;
}

export default function Welcome({ community }: { community: Community }) {
  const { t } = useTranslation();
  const { data: profile } = useProfile(community.pubkey);
  const { data: userRelays } = useRelayList(community.pubkey);
  const myGroups = useMyGroups();
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
    <div className="flex items-center justify-center px-1">
      <div className="flex flex-col relative w-full max-w-lg">
        <Banner imgSrc={banner} />

        {/* Banner, Avatar and Action Buttons Section */}
        <div className="flex flex-row justify-between items-center -mt-16">
          <div className="pl-2 flex items-end">
            <User
              notClickable
              pubkey={community.pubkey}
              classNames={{
                avatar: "size-32 border-4 border-background",
                name: "hidden",
                wrapper: "flex-row gap-3 items-end",
              }}
            />
          </div>

          {/* Action Buttons - now positioned independently */}
          <div className="flex flex-row gap-2 -mb-11">
            {/* Zap Button - only show if community can receive zaps */}
            {profile?.lud16 && (
              <NewZapDialog
                pubkey={community.pubkey}
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
            {/* Join/Joined Button */}
            {isMember ? (
              <Button disabled variant="outline" size="sm">
                <Check className="size-4 text-green-500 dark:text-green-400" />
                <span className="hidden sm:inline ml-2">
                  {t("groups.welcome.joined")}
                </span>
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={handleJoinClick}>
                <MessageSquare className="size-4" />
                <span className="hidden sm:inline ml-2">
                  {t("groups.welcome.join")}
                </span>
              </Button>
            )}
          </div>
        </div>

        {/* Name, Description, Content Types Section */}
        <div className="px-2 pb-2 flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <div className="flex flex-col gap-0">
              <User
                notClickable
                pubkey={community.pubkey}
                classNames={{
                  avatar: "hidden",
                  name: "text-4xl",
                  wrapper: "flex-col gap-0 items-start",
                }}
              />
              <ProfileColor pubkey={community.pubkey} relays={relays} />
            </div>
            {description && (
              <RichText
                tags={profile?.tags}
                className="text-balance text-muted-foreground mt-2"
              >
                {description}
              </RichText>
            )}
            {allKinds.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
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

          {(profile?.website ||
            profile?.nip05 ||
            community.location ||
            community.geohash) && (
            <div className="flex flex-col items-start gap-1">
              {mapUrl && (
                <Link
                  to={mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="break-all font-mono text-xs px-2 hover:underline hover:decoration-dotted"
                >
                  <div className="flex flex-row items-center gap-1">
                    <MapPin className="flex-shrink-0 size-3 text-muted-foreground" />
                    {community.location ? (
                      <span className="font-mono">{community.location}</span>
                    ) : (
                      <span className="font-mono">{community.geohash}</span>
                    )}
                  </div>
                </Link>
              )}
              {profile?.website && (
                <Link
                  to={profile.website}
                  className="break-all font-mono text-xs px-2 hover:underline hover:decoration-dotted"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <div className="flex flex-row items-center gap-1">
                    <LinkIcon className="flex-shrink-0 size-3 text-muted-foreground" />
                    {profile.website}
                  </div>
                </Link>
              )}
              {profile?.nip05 && (
                <span className="font-mono text-xs px-2">
                  <div className="flex flex-row items-center gap-1">
                    <AtSign className="size-3 text-muted-foreground" />
                    <Nip05 pubkey={profile.pubkey} />
                  </div>
                </span>
              )}
            </div>
          )}
        </div>
        <div className="px-2 pt-2 pb-8 flex flex-col gap-4">
          {userRelays ? (
            <Supporters community={community} relays={userRelays} />
          ) : null}
          {pinned.length > 0 ? (
            <div className="flex flex-col gap-2">
              <div className="flex flex-row items-center gap-1">
                <Pin className="size-4 text-muted-foreground" />
                <h2 className="text-sm font-light uppercase text-muted-foreground">
                  {t("groups.welcome.pinned-posts")}
                </h2>
              </div>
              <div className="flex flex-col gap-2">
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
              <div className="flex flex-col gap-2">
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

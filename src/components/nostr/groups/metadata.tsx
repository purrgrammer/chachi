import { NostrEvent } from "nostr-tools";
import {
  CloudUpload,
  Landmark,
  MessagesSquare,
  Server,
  Castle,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCommunity, useGroup } from "@/lib/nostr/groups";
import { Avatar as NostrAvatar } from "@/components/nostr/avatar";
import { Name } from "@/components/nostr/name";
import { Button } from "@/components/ui/button";
import { RichText } from "@/components/rich-text";
import { useRelayInfo } from "@/lib/relay";
import { cn } from "@/lib/utils";
import { useOpenGroup } from "@/lib/groups";
import { Group } from "@/lib/types";
import { useTranslation } from "react-i18next";
import { useProfile } from "@/lib/nostr";
import { useNavigate } from "react-router-dom";
import { BlossomLink } from "@/components/blossom";
import { RelayLink } from "../relay";
import { MintLink } from "@/components/mint";

export function GroupPicture({
  group,
  className,
}: {
  group: Group;
  className?: string;
}) {
  const { id, relay } = group;
  const { data: metadata } = useGroup({ id, relay });
  const { data: relayInfo } = useRelayInfo(relay);
  const isRelayGroup = id === "_";
  const name = isRelayGroup ? relayInfo?.name : metadata?.name;
  const img = isRelayGroup ? relayInfo?.icon : metadata?.picture;
  return (
    <Avatar className={cn("size-6 rounded-full", className)}>
      <AvatarImage src={img} className="object-cover" />
      <AvatarFallback>{name?.at(0) || id.at(0)}</AvatarFallback>
    </Avatar>
  );
}

export function GroupName({
  group,
  className,
}: {
  group: Group;
  className?: string;
}) {
  const { id, relay } = group;
  const { data: metadata } = useGroup({ id, relay });
  const { data: relayInfo } = useRelayInfo(relay);
  const isRelayGroup = id === "_";
  const name = isRelayGroup ? relayInfo?.name : metadata?.name;
  return <span className={className}>{name || id.slice(0, 8)}</span>;
}

export function GroupMetadata({
  event,
  group,
  relays,
  className,
}: {
  event: NostrEvent;
  group?: Group;
  relays: string[];
  className?: string;
}) {
  const id = event.tags.find((t) => t[0] === "d")?.[1] ?? "_";
  const relay = relays[0];
  const name = event.tags.find((t) => t[0] === "name")?.[1];
  const picture = event.tags.find((t) => t[0] === "picture")?.[1];
  const about = event.tags.find((t) => t[0] === "about")?.[1];
  const openGroup = useOpenGroup({ id, relay });
  const { t } = useTranslation();
  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="flex flex-col gap-1 items-center">
        <Avatar className="rounded-full size-32">
          <AvatarImage src={picture} className="object-cover" />
          <AvatarFallback>{name?.at(0) || id.at(0)}</AvatarFallback>
        </Avatar>
        <h2 className="text-lg font-semibold">{name}</h2>
        {about ? (
          <RichText
            tags={event.tags}
            group={group}
            className="text-sm text-center text-muted-foreground"
          >
            {about}
          </RichText>
        ) : null}
      </div>
      <Button size="sm" onClick={openGroup}>
        <MessagesSquare /> {t("group.metadata.join-the-conversation")}
      </Button>
    </div>
  );
}

export function CommunityMetadata({
  event,
  group,
  className,
}: {
  event: NostrEvent;
  group?: Group;
  className?: string;
}) {
  const { data: profile } = useProfile(event.pubkey);
  const { data: community } = useCommunity(event.pubkey);
  const navigate = useNavigate();

  function openGroup() {
    navigate(`/c/${event.pubkey}`);
  }
  const { t } = useTranslation();
  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="flex flex-row gap-3 items-center">
        <Castle className="size-8 text-muted-foreground" />
        <div className="flex flex-row gap-2 items-center">
          <NostrAvatar pubkey={event.pubkey} className="size-8" />
          <div className="flex flex-col gap-0 items-start">
            <h3 className="text-lg font-semibold line-clamp-1">
              <Name pubkey={event.pubkey} />
            </h3>
            {profile?.about ? (
              <RichText
                tags={event.tags}
                group={group}
                className="text-sm text-center text-muted-foreground line-clamp-1"
              >
                {profile?.about}
              </RichText>
            ) : null}
          </div>
        </div>
      </div>
      {community?.relay ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Server className="size-4 text-muted-foreground" />
            <h3 className="text-sm text-muted-foreground uppercase">
              {t("community.relays.title")}
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <RelayLink
              relay={community.relay}
              classNames={{ icon: "size-4", name: "text-sm" }}
            />
          </div>
        </div>
      ) : null}

      {community?.blossom && community.blossom.length > 0 ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <CloudUpload className="size-4 text-muted-foreground" />
            <h3 className="text-sm text-muted-foreground uppercase">
              {t("community.blossom.title")}
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
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

      {community?.mint ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Landmark className="size-4 text-muted-foreground" />
            <h3 className="text-sm text-muted-foreground uppercase">
              {t("community.mint.title")}
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <MintLink
              url={community.mint}
              classNames={{ icon: "size-4", name: "text-sm" }}
            />
          </div>
        </div>
      ) : null}
      <Button size="sm" onClick={openGroup}>
        <MessagesSquare /> {t("group.metadata.join-the-conversation")}
      </Button>
    </div>
  );
}

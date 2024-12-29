import { NostrEvent } from "nostr-tools";
import { MessagesSquare } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useGroup } from "@/lib/nostr/groups";
import { Button } from "@/components/ui/button";
import { useRelayInfo } from "@/lib/relay";
import { cn } from "@/lib/utils";
import { useOpenGroup } from "@/lib/groups";
import { Group } from "@/lib/types";
import { useTranslation } from "react-i18next";

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
  relays,
  className,
}: {
  event: NostrEvent;
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
          <p className="text-sm text-center text-muted-foreground">{about}</p>
        ) : null}
      </div>
      <Button size="sm" onClick={openGroup}>
        <MessagesSquare /> {t("group.metadata.join-the-conversation")}
      </Button>
    </div>
  );
}

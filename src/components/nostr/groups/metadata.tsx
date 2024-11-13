import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useGroup } from "@/lib/nostr/groups";
import { useRelayInfo } from "@/lib/relay";
import { cn } from "@/lib/utils";
import { Group } from "@/lib/types";

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

import { useMemo } from "react";
import { useRelayInfo } from "@/lib/relay";
import { cn } from "@/lib/utils";

export function RelayName({ relay }: { relay: string }) {
  const host = useMemo(() => new URL(relay).hostname, [relay]);
  const { data: metadata } = useRelayInfo(relay);
  return metadata?.name || host || relay;
}

export function RelayIcon({
  relay,
  className,
}: {
  relay: string;
  className?: string;
}) {
  const { data: metadata } = useRelayInfo(relay);
  return metadata?.icon ? (
    <img
      src={metadata.icon}
      className={cn("size-4 object-cover rounded-full", className)}
      alt={relay}
    />
  ) : null;
}

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
  // fixme: temporary fix since their icon 404s
  const isCoinOs = relay.endsWith(".coinos.io");
  const coinOsFavicon = "https://coinos.io/favicon.ico";
  return metadata?.icon ? (
    <img
      src={isCoinOs ? coinOsFavicon : metadata.icon}
      className={cn("size-4 object-cover rounded-full", className)}
      alt={relay}
    />
  ) : null;
}

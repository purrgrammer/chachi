import { useMemo } from "react";
import { useMintInfo } from "@/lib/cashu";
import { useHost } from "@/lib/hooks";
import { cn } from "@/lib/utils";

export function MintIcon({
  url,
  className,
}: {
  url: string;
  className?: string;
}) {
  const { data: info } = useMintInfo(url);
  const host = useHost(url);
  const is0xChat = host.endsWith("0xchat.com");
  const icon =
    // @ts-expect-error the cashu-ts type lacks this field
    info?.icon_url
      ? // @ts-expect-error the cashu-ts type lacks this field
        info.icon_url
      : is0xChat
        ? `https://0xchat.com/favicon1.png`
        : null;
  return icon ? (
    <img
      src={icon}
      className={cn("size-6 object-cover rounded-full", className)}
    />
  ) : null;
}

export function MintName({
  url,
  className,
}: {
  url: string;
  className?: string;
}) {
  const host = useMemo(() => new URL(url).hostname, [url]);
  const { data: info } = useMintInfo(url);
  return <span className={className}>{info?.name || host || url}</span>;
}

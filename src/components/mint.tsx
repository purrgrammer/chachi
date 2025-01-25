import { useMemo } from "react";
import { useMintInfo } from "@/lib/cashu";
import { cn } from "@/lib/utils";

export function MintIcon({
  url,
  className,
}: {
  url: string;
  className?: string;
}) {
  const { data: info } = useMintInfo(url);
  // @ts-expect-error the cashu-ts type lacks this field
  const icon = info?.icon_url;
  return icon ? (
    <img
      src={icon}
      className={cn("size-6 object-cover rounded-full", className)}
    />
  ) : null;
}

export function MintName({ url }: { url: string }) {
  const host = useMemo(() => new URL(url).hostname, [url]);
  const { data: info } = useMintInfo(url);
  return info?.name || host || url;
}

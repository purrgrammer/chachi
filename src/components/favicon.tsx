import { useFavicon } from "@/lib/hooks";
import { cn } from "@/lib/utils";

export function Favicon({
  url,
  className,
}: {
  url: string;
  className?: string;
}) {
  const favicon = useFavicon(url);
  return favicon ? (
    <img className={cn("w-4 h-4", className)} src={favicon} alt="Favicon" />
  ) : null;
}

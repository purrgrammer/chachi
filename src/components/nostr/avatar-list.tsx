import { Avatar } from "@/components/nostr/avatar";
import { cn } from "@/lib/utils";
import { formatShortNumber } from "@/lib/number";

export function AvatarList({
  pubkeys,
  className,
  size = "sm",
  max = 3,
  suffix = " members",
  singularSuffix = " member",
}: {
  pubkeys: string[];
  className?: string;
  size?: "sm" | "md";
  max?: number;
  suffix?: string;
  singularSuffix?: string;
}) {
  const avatarClassName = size === "sm" ? "size-6" : "size-8";
  const zIndexes = ["z-40", "z-30", "z-20"];
  if (pubkeys.length === 0) return null;
  return (
    <div className={cn("flex flex-row gap-2", className)}>
      {pubkeys.slice(0, max).map((pubkey, idx) => (
        <Avatar
          key={pubkey}
          className={cn(
            zIndexes[idx],
            idx > 0 && size === "sm"
              ? "-ml-4"
              : idx > 0 && size === "md"
                ? "-ml-5"
                : "",
            avatarClassName,
          )}
          pubkey={pubkey}
        />
      ))}
      <div
        className={`z-10 ${size === "sm" ? "text-xs" : "text-sm"} bg-accent px-3 ${size === "sm" ? "-ml-4" : "-ml-3"} rounded-l-xl rounded-r-xl flex items-center justify-center`}
      >
        {formatShortNumber(pubkeys.length)}
        {singularSuffix && pubkeys.length === 1 ? singularSuffix : suffix}
      </div>
    </div>
  );
}

import { useProfiles } from "@/lib/nostr";
import { Name } from "@/components/nostr/name";
import { Avatar } from "@/components/nostr/avatar";
import { cn } from "@/lib/utils";

export function NameList({
  pubkeys,
  suffix,
  className,
  avatarClassName,
  textClassName,
}: {
  pubkeys: string[];
  suffix?: string;
  className?: string;
  avatarClassName?: string;
  textClassName?: string;
}) {
  const q = useProfiles(pubkeys);
  const profiles = q.map((q) => q.data).filter(Boolean);
  const deduped = Array.from(new Set(profiles.map((p) => p.pubkey)));
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {deduped.map((pubkey, idx) => (
        <div key={pubkey} className="flex items-center gap-0">
          <Avatar
            pubkey={pubkey}
            className={cn("size-5 mr-1 inline-block", avatarClassName)}
          />
          <span className={cn("font-semibold", textClassName)}>
            <Name key={pubkey} pubkey={pubkey} />
            {idx < deduped.length - 2 ? (
              <span className={textClassName}>, </span>
            ) : idx === deduped.length - 2 ? (
              <span className={textClassName}> and </span>
            ) : null}
          </span>
        </div>
      ))}
      {suffix && deduped.length > 0 ? (
        <span className={textClassName}> {suffix}</span>
      ) : null}
    </div>
  );
}

import { useProfiles } from "@/lib/nostr";
import { User } from "@/components/nostr/user";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  const profiles = q.map((q) => q.data).filter(Boolean);
  const deduped = Array.from(new Set(profiles.map((p) => p.pubkey)));
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {deduped.map((pubkey, idx) => (
        <div key={pubkey} className="flex items-center gap-0">
          <User
            key={pubkey}
            pubkey={pubkey}
            classNames={{
              wrapper: cn("flex items-center gap-0", className),
              avatar: cn("size-5 mr-1 inline-block", avatarClassName),
              name: cn("font-semibold", textClassName),
            }}
          />
          {idx < deduped.length - 2 ? (
            <span className={textClassName}>{t("names.comma")}</span>
          ) : idx === deduped.length - 2 ? (
            <span className={cn("ml-1", textClassName)}>{t("names.and")}</span>
          ) : null}
        </div>
      ))}
      {suffix && deduped.length > 0 ? (
        <span className={textClassName}> {suffix}</span>
      ) : null}
    </div>
  );
}

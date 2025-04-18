import { Link } from "react-router-dom";
import { useProfiles } from "@/lib/nostr";
import { User } from "@/components/nostr/user";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export function CommunityList({
  pubkeys,
  suffix,
  className,
  avatarClassName,
  textClassName,
  max = 3,
}: {
  pubkeys: string[];
  suffix?: string;
  className?: string;
  avatarClassName?: string;
  textClassName?: string;
  max?: number;
}) {
  const q = useProfiles(pubkeys);
  const { t } = useTranslation();
  const profiles = q.map((q) => q.data).filter(Boolean);
  const deduped = Array.from(new Set(profiles.map((p) => p.pubkey)));
  const isMoreThanMax = deduped.length > max;
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {isMoreThanMax
        ? deduped.slice(0, max).map((pubkey, idx) => (
            <Link
              to={`/c/${pubkey}`}
              key={pubkey}
              className="flex items-center gap-0"
            >
              <User
                notClickable
                key={pubkey}
                pubkey={pubkey}
                classNames={{
                  wrapper: cn("flex items-center gap-0", className),
                  avatar: cn("size-5 mr-1 inline-block", avatarClassName),
                  name: cn("font-semibold", textClassName),
                }}
              />
              {idx < max - 1 ? (
                <span className={textClassName}>{t("names.comma")}</span>
              ) : idx === max - 1 ? (
                <span className={cn("ml-1", textClassName)}>
                  {t("names.and-more", { more: deduped.length - max })}
                </span>
              ) : null}
            </Link>
          ))
        : deduped.map((pubkey, idx) => (
            <Link
              key={pubkey}
              to={`/c/${pubkey}`}
              className="flex items-center gap-0"
            >
              <User
                notClickable
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
                <span className={cn("ml-1", textClassName)}>
                  {t("names.and")}
                </span>
              ) : null}
            </Link>
          ))}
      <span className={textClassName}> {suffix}</span>
    </div>
  );
}

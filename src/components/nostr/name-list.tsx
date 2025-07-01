import { useProfiles } from "@/lib/nostr";
import { User } from "@/components/nostr/user";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

// todo: configurable link

export function NameList({
  pubkeys,
  suffix,
  className,
  avatarClassName,
  textClassName,
  userClassnames,
  max = 3,
  notClickable = false,
}: {
  pubkeys: string[];
  suffix?: string;
  className?: string;
  avatarClassName?: string;
  userClassnames?: {
    avatar?: string;
    wrapper?: string;
    name?: string;
  };
  textClassName?: string;
  max?: number;
  notClickable?: boolean;
}) {
  const { profiles } = useProfiles(pubkeys);
  const { t } = useTranslation();
  const deduped = Array.from(new Set(profiles.map((p) => p.pubkey)));
  const isMoreThanMax = deduped.length > max;
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {isMoreThanMax
        ? deduped.slice(0, max).map((pubkey, idx) => (
            <div key={pubkey} className="flex items-center gap-0">
              <User
                notClickable={notClickable}
                key={pubkey}
                pubkey={pubkey}
                classNames={
                  userClassnames
                    ? userClassnames
                    : {
                        wrapper: cn("flex items-center gap-0", className),
                        avatar: cn("size-5 mr-1 inline-block", avatarClassName),
                        name: cn("font-semibold", textClassName),
                      }
                }
                clickAction="link"
              />
              {idx < max - 1 ? (
                <span className={textClassName}>{t("names.comma")}</span>
              ) : idx === max - 1 ? (
                <span className={cn("ml-1", textClassName)}>
                  {t("names.and-more", { more: deduped.length - max })}
                </span>
              ) : null}
            </div>
          ))
        : deduped.map((pubkey, idx) => (
            <div key={pubkey} className="flex items-center gap-0">
              <User
                notClickable={notClickable}
                key={pubkey}
                pubkey={pubkey}
                classNames={
                  userClassnames
                    ? userClassnames
                    : {
                        wrapper: cn("flex items-center gap-0", className),
                        avatar: cn("size-5 mr-1 inline-block", avatarClassName),
                        name: cn("font-semibold", textClassName),
                      }
                }
                clickAction="link"
              />
              {idx < deduped.length - 2 ? (
                <span className={textClassName}>{t("names.comma")}</span>
              ) : idx === deduped.length - 2 ? (
                <span className={cn("ml-1", textClassName)}>
                  {t("names.and")}
                </span>
              ) : null}
            </div>
          ))}
      {suffix && deduped.length > 0 ? (
        <span className={textClassName}> {suffix}</span>
      ) : null}
    </div>
  );
}

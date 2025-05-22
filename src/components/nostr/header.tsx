import { useTranslation } from "react-i18next";
import { Globe, MessageCircleQuestion } from "lucide-react";
import { NDKKind } from "@nostr-dev-kit/ndk";
import { NostrEvent } from "nostr-tools";
import { formatRelativeTime } from "@/lib/time";
import { validateZap } from "@/lib/nip-57";
import { User } from "@/components/nostr/user";
import { CommunityList } from "@/components/nostr/community-list";
import { TARGETED_PUBLICATION } from "@/lib/kinds";
import { GroupLink } from "@/components/nostr/group-link";

export function Header({ event }: { event: NostrEvent }) {
  const { t } = useTranslation();
  const groupTag = event.tags.find((t) => t[0] === "h");
  const [, group, relay] = groupTag ? groupTag : [];
  // todo: try harder to figure out the right relay if not present
  const host = event.tags.find((t) => t[0] === "p" && t[3] === "host")?.[1];
  const author = host
    ? host
    : event.kind === NDKKind.Zap
      ? validateZap(event)?.pubkey
      : event.kind === TARGETED_PUBLICATION
        ? event.tags.find((t) => t[0] === "p")?.[1] || event.pubkey
        : event.pubkey;
  const publishedAt = event.tags.find((t) => t[0] === "published_at")?.[1];
  const startsAt = event.tags.find((t) => t[0] === "starts")?.[1];
  const timestamp = Number(publishedAt) || Number(startsAt) || event.created_at;
  const hPubkeyTags = event.tags
    .filter((t) => t[0] === "h" && t[1]?.length === 64)
    .map((t) => t[1]);
  const groupName = (
    <span className="text-xs text-muted-foreground">
      {group && relay ? (
        <GroupLink group={{ id: group, relay }} />
      ) : group ? (
        <div className="flex flex-row items-center gap-1">
          <MessageCircleQuestion className="size-3" />
          <span>{t("header.unknown")}</span>
        </div>
      ) : (
        <div className="flex flex-row items-center gap-1">
          <Globe className="size-3" />
          <span>{t("header.public")}</span>
        </div>
      )}
    </span>
  );
  const op = (
    <div className="flex flex-row items-center gap-1.5">
      <User
        pubkey={author ?? event.pubkey}
        classNames={{ avatar: "size-9", name: "hidden" }}
      />
      <div className="flex flex-col gap-0">
        <User
          pubkey={author ?? event.pubkey}
          classNames={{ avatar: "hidden", name: "text-md font-normal" }}
        />
        {event.kind === TARGETED_PUBLICATION && hPubkeyTags.length > 0 ? (
          <CommunityList
            avatarClassName="size-3"
            textClassName="font-light text-xs text-muted-foreground"
            pubkeys={hPubkeyTags}
          />
        ) : (
          groupName
        )}
      </div>
    </div>
  );
  const time = (
    <span className="text-sm text-muted-foreground">
      {formatRelativeTime(timestamp ?? 0)}
    </span>
  );
  return (
    <div className="flex flex-row items-center justify-between w-full">
      {op}
      <div className="flex flex-row items-center gap-3">{time}</div>
    </div>
  );
}

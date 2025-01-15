import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Globe, MessageCircleQuestion } from "lucide-react";
import { NDKKind } from "@nostr-dev-kit/ndk";
import { NostrEvent } from "nostr-tools";
import { Name } from "@/components/nostr/name";
import { formatRelativeTime } from "@/lib/time";
import { useGroup } from "@/lib/nostr/groups";
import { groupURL } from "@/lib/groups";
import { validateZap } from "@/lib/nip-57";
import { Avatar } from "@/components/nostr/avatar";

function GroupName({ id, relay }: { id: string; relay: string }) {
  const group = { id, relay };
  const { data: metadata } = useGroup(group);
  return metadata ? (
    <Link
      to={groupURL(group)}
      className="text-xs hover:cursor-pointer hover:underline hover:decoration-dotted"
    >
      <div className="flex flex-row items-center gap-1">
        {metadata.picture ? (
          <img src={metadata.picture} className="size-3 rounded-full" />
        ) : null}
        <span>{metadata.name}</span>
      </div>
    </Link>
  ) : null;
}

// todo: link to user profile
export function Header({
  event,
  icons,
}: {
  event: NostrEvent;
  icons?: ReactNode;
}) {
  const { t } = useTranslation();
  const groupTag = event.tags.find((t) => t[0] === "h");
  const [, group, relay] = groupTag ? groupTag : [];
  // todo: try harder to figure out the right relay if not present
  const host = event.tags.find((t) => t[0] === "p" && t[3] === "host")?.[1];
  const author = host
    ? host
    : event.kind === NDKKind.Zap
      ? validateZap(event)?.pubkey
      : event.pubkey;
  const publishedAt = event.tags.find((t) => t[0] === "published_at")?.[1];
  const startsAt = event.tags.find((t) => t[0] === "starts")?.[1];
  const timestamp = Number(publishedAt) || Number(startsAt) || event.created_at;
  return (
    <div className="flex flex-row items-center justify-between w-full">
      <div className="flex flex-row items-center w-full gap-2">
        <Avatar pubkey={author ?? event.pubkey} className="size-9" />
        <div className="flex flex-col w-full gap-0">
          <div className="flex flex-row gap-1 items-center">
            <div className="flex flex-row items-center gap-1.5">
              <span className="font-semibold">
                <Name pubkey={author ?? event.pubkey} />
              </span>
              {icons}
            </div>
          </div>
          <span className="text-xs text-muted-foreground">
            {group && relay ? (
              <GroupName id={group} relay={relay} />
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
        </div>
        <span className="text-xs text-muted-foreground">
          {formatRelativeTime(timestamp ?? 0)}
        </span>
      </div>
    </div>
  );
}

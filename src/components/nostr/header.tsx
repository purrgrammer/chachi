import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Avatar } from "@/components/nostr/avatar";
import { Globe, MessageCircleQuestion } from "lucide-react";
import { NDKKind } from "@nostr-dev-kit/ndk";
import { NostrEvent } from "nostr-tools";
import { formatRelativeTime } from "@/lib/time";
import { useGroup } from "@/lib/nostr/groups";
import { groupURL } from "@/lib/groups";
import { validateZap } from "@/lib/nip-57";
import { Name } from "./name";
import { TARGETED_PUBLICATION } from "@/lib/kinds";

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
  const groupName = (
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
  );
  const op = (
    <div className="flex flex-row items-center gap-1.5">
      <Avatar pubkey={author ?? event.pubkey} className="size-9" />
      <div className="flex flex-col gap-0">
        <span className="text-md">
          <Name pubkey={author ?? event.pubkey} />
        </span>
        {event.kind === TARGETED_PUBLICATION ? null : groupName}
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

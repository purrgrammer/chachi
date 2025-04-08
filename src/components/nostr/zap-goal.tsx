import { Link } from "react-router-dom";
import { Goal, Link as LinkIcon, Bitcoin } from "lucide-react";
import { useTranslation } from "react-i18next";
import { NostrEvent } from "nostr-tools";
import { Progress } from "@/components/ui/progress";
import { RichText } from "@/components/rich-text";
import { formatShortNumber } from "@/lib/number";
import { formatDateTime } from "@/lib/time";
import { validateZap } from "@/lib/nip-57";
import { validateNutzap } from "@/lib/nip-61";
import type { Group } from "@/lib/types";
import { useReactions } from "@/lib/nostr";
import { NDKKind } from "@nostr-dev-kit/ndk";

//function zapLeaderboard(zaps: Zap[]): { pubkey: string; amount: number }[] {
//  const contributions = zaps.reduce((acc, z) => {
//    const n = acc[z.pubkey] || 0;
//    return { ...acc, [z.pubkey]: n + z.amount };
//  }, {});
//  return Object.entries(contributions)
//    .map(([pubkey, amount]) => ({ pubkey, amount }))
//    .sort((a, b) => b.amount - a.amount);
//}

export function ZapGoal({
  event,
  group,
}: {
  event: NostrEvent;
  group?: Group;
}) {
  const { t } = useTranslation();
  const website = event.tags.find((t) => t[0] === "r")?.[1];
  const relays = event.tags.find((t) => t[0] === "relays")?.slice(1) || [];
  const amount = event.tags.find((t) => t[0] === "amount")?.[1];
  const closedAt = event.tags.find((t) => t[0] === "closed_at")?.[1];
  const expiryDate = closedAt ? new Date(Number(closedAt)) : null;
  const isExpired = expiryDate && expiryDate.getTime() < Date.now();
  const title = event.content.trim();
  const description = event.tags.find((t) => t[0] === "summary")?.[1]?.trim();
  const zaps = useReactions(
    event,
    [NDKKind.Zap, NDKKind.Nutzap],
    relays,
    !isExpired,
  );
  const zapEvents = zaps.events
    .map((z) => (z.kind === NDKKind.Zap ? validateZap(z) : validateNutzap(z)))
    .filter(Boolean) as { amount: number }[];
  const totalZapped = zapEvents.reduce((acc, z) => acc + z.amount, 0);
  const totalGoal = Number(amount) / 1000;
  const percentage = Math.min((totalZapped / totalGoal) * 100, 100);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-row gap-2 items-center justify-between">
        <h3 className="text-lg font-semibold line-clamp-1">{title}</h3>
        <div className="flex flex-row gap-1 items-center">
          <Goal className="size-5 text-muted-foreground" />
          <div className="flex flex-row items-center">
            <span className="text-sm">{formatShortNumber(totalGoal)}</span>
            <Bitcoin className="size-4 text-muted-foreground" />
          </div>
        </div>
      </div>
      {description ? (
        <RichText
          tags={event.tags}
          group={group}
          className="text-sm line-clamp-6"
        >
          {description}
        </RichText>
      ) : null}
      {website ? (
        <div className="mx-3 my-1 flex flex-row gap-1.5 items-center text-muted-foreground">
          <LinkIcon className="size-3" />
          <Link
            to={website}
            className="text-xs font-mono line-clamp-1 underline decoration-dotted"
          >
            {website}
          </Link>
        </div>
      ) : null}
      <div className="flex flex-col gap-0">
        <div className="flex flex-row gap-3 p-1 items-center">
          <Progress value={percentage} max={100} />
          <span className="text-sm font-mono text-muted-foreground">
            {new Intl.NumberFormat("en-US", {
              style: "percent",
              maximumFractionDigits: 2,
              minimumFractionDigits: 0,
            }).format(percentage / 100)}
          </span>
        </div>
        {expiryDate ? (
          <div className="ml-2">
            {isExpired ? (
              <span className="text-xs text-muted-foreground">
                {t("goal.expired")}
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">
                {t("goal.expires-in")} {formatDateTime(expiryDate.getTime())}
              </span>
            )}
          </div>
        ) : null}
      </div>
      {/*
      <div className="flex flex-col gap-1.5 py-2 px-3">
      <div className="flex flex-row gap-1 items-center">
      <Medal className="size-3 text-muted-foreground" />
      <h4 className="text-xs uppercase font-light text-muted-foreground">{t("goal.leaderboard")}</h4>
      </div>
      {leaderboard.slice(0, 3).map(({ pubkey, amount }, idx) => (
        <div className="flex flex-row justify-between" key={pubkey}>
          <div className="flex flex-row items-center gap-2">
            <Trophy className={`size-5 ${idx === 0 ? 'text-yellow-500' : idx === 1 ? 'text-gray-500' : 'text-yellow-800'}`} />
            <User
              pubkey={pubkey}
              classNames={{ avatar: "size-6", name: "text-lg" }}
            />
          </div>
          <div className="flex flex-row items-center gap-2">
            <span className="text-lg font-mono">
              {formatShortNumber(amount)}
            </span>
            <Bitcoin className="size-5 text-muted-foreground" />
          </div>
        </div>
      ))}
      </div>
      */}
    </div>
  );
}

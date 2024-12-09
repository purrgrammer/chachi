import type { ReactNode } from "react";
import { NDKKind } from "@nostr-dev-kit/ndk";
import { NostrEvent } from "nostr-tools";
import { Name } from "@/components/nostr/name";
import { formatRelativeTime } from "@/lib/time";
import { validateZap } from "@/lib/nip-57";
import { STREAM } from "@/lib/kinds";
import { Avatar } from "@/components/nostr/avatar";

// todo: link to user profile
// todo: communities
export function Header({
  event,
  icons,
}: {
  event: NostrEvent;
  icons?: ReactNode;
}) {
  const host = event.tags.find((t) => t[0] === "p" && t[3] === "host")?.[1];
  const author =
    event.kind === STREAM && host
      ? host
      : event.kind === NDKKind.Zap
        ? validateZap(event)?.pubkey
        : event.pubkey;
  const publishedAt = event.tags.find((t) => t[0] === "published_at")?.[1];
  const timestamp = Number(publishedAt) || event.created_at;
  return (
    <div className="flex flex-row items-center justify-between w-full">
      <div className="flex flex-row items-center gap-2">
        <Avatar pubkey={author ?? event.pubkey} className="size-9" />
        <div className="flex flex-col">
          <div className="flex flex-row items-center gap-1.5">
            <span className="font-semibold">
              <Name pubkey={author ?? event.pubkey} />
            </span>
            {icons}
          </div>
          <span className="text-xs text-muted-foreground">
            {formatRelativeTime(timestamp ?? 0)}
          </span>
        </div>
      </div>
    </div>
  );
}

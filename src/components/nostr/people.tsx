import type { NostrEvent } from "nostr-tools";
import { Users } from "lucide-react";
import { Avatar } from "@/components/nostr/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Name } from "@/components/nostr/name";
import { ProfileDrawer } from "@/components/nostr/profile";
import type { Group } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function People({
  event,
  group,
  className,
}: {
  event: NostrEvent;
  group: Group;
  className?: string;
}) {
  const title =
    event.tags.find((t) => t[0] === "title")?.[1] ||
    event.tags.find((t) => t[0] === "d")?.[1];
  const description = event.tags.find((t) => t[0] === "description")?.[1];
  const pubkeys = event.tags.filter((t) => t[0] === "p").map((t) => t[1]);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-0">
        <div className="flex flex-row gap-2 items-center justify-between">
          {title ? <h2 className="text-xl">{title}</h2> : null}
          <div className="flex flex-row items-center gap-1 text-muted-foreground">
            <Users className="size-4" />
            <span className="text-xs font-mono">{pubkeys.length}</span>
          </div>
        </div>
        {description ? (
          <p className="text-sm text-muted-foreground line-clamp-3">
            {description}
          </p>
        ) : null}
      </div>
      <ScrollArea>
        <div className={cn("flex flex-col gap-1.5 max-h-32", className)}>
          {pubkeys.map((pubkey) => (
            <ProfileDrawer
              key={pubkey}
              group={group}
              trigger={
                <div className="flex flex-row items-center gap-2">
                  <Avatar pubkey={pubkey} className="size-6" />
                  <Name pubkey={pubkey} />
                </div>
              }
              pubkey={pubkey}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

import { forwardRef } from "react";
import type { ForwardedRef } from "react";
import { NDKKind } from "@nostr-dev-kit/ndk";
import { useStream } from "@/lib/nostr";
import { Empty } from "@/components/empty";
import { Embed } from "@/components/nostr/detail";
import { cn } from "@/lib/utils";
import type { Group } from "@/lib/types";

export const GroupArticles = forwardRef(
  (
    { group, className }: { group: Group; className?: string },
    ref: ForwardedRef<HTMLDivElement | null>,
  ) => {
    const filter = {
      kinds: [NDKKind.Article],
      "#h": [group.id],
      limit: 50,
    };
    const { eose, events } = useStream(filter, [group.relay]);
    return (
      <div
        ref={ref}
        className={cn(
          "flex flex-col items-center w-full py-2 overflow-y-auto",
          className,
        )}
        style={{ height: `calc(100vh - 80px)` }}
      >
        {events.length === 0 && eose ? (
          <Empty />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {events.map((event) => (
              <Embed
                key={event.id}
                event={event}
                group={group}
                relays={[group.relay]}
                className="border rounded-sm max-w-lg cursor-pointer hover:bg-secondary/60 text-left"
              />
            ))}
          </div>
        )}
      </div>
    );
  },
);
GroupArticles.displayName = "GroupArticles";

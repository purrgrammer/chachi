import { forwardRef } from "react";
import type { ForwardedRef } from "react";
import { NDKKind } from "@nostr-dev-kit/ndk";
import { useRequest } from "@/lib/nostr";
import { Empty } from "@/components/empty";
import { ArticleSummary } from "@/components/nostr/article";
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
    const { eose, events } = useRequest(filter, [group.relay]);
    return (
      <div
        ref={ref}
        className={cn(
          "flex flex-col items-center w-full py-2 overflow-y-auto",
          className,
        )}
        style={{ height: `calc(100vh - 90px)` }}
      >
        {events.length === 0 && eose ? (
          <Empty />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {events.map((event) => (
              <ArticleSummary
                key={event.id}
                event={event}
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

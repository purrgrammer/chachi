import { forwardRef } from "react";
import type { ForwardedRef } from "react";
import { useStream } from "@/lib/nostr";
import { Empty } from "@/components/empty";
import { FeedEmbed } from "@/components/nostr/detail";
import { cn } from "@/lib/utils";
import { POLL } from "@/lib/kinds";
import type { Group } from "@/lib/types";

export const GroupPolls = forwardRef(
  (
    { group, className }: { group: Group; className?: string },
    ref: ForwardedRef<HTMLDivElement | null>,
  ) => {
    const filter = {
      kinds: [POLL],
      "#h": [group.id],
      limit: 5,
    };
    const { eose, events } = useStream(filter, [group.relay], true, true);
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
          <div className="flex flex-col gap-1 w-[calc(100vw-2rem)] sm:w-[420px] md:w-[510px]">
            {events.map((event) => (
              <FeedEmbed key={event.id} event={event} group={group} />
            ))}
          </div>
        )}
      </div>
    );
  },
);
GroupPolls.displayName = "GroupPolls";

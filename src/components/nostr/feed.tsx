import { forwardRef } from "react";
import type { ForwardedRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ReactNode } from "react";
import { NDKFilter } from "@nostr-dev-kit/ndk";
import { FeedEmbed } from "@/components/nostr/detail";
import { Empty } from "@/components/empty";
import { Loading } from "@/components/loading";
import { cn } from "@/lib/utils";
import { useStream } from "@/lib/nostr";
import type { Group } from "@/lib/types";

interface FeedProps extends React.HTMLAttributes<HTMLDivElement> {
  group?: Group;
  outboxRelays?: string[];
  filter: NDKFilter | NDKFilter[];
  live?: boolean;
  onlyRelays?: boolean;
  newPost?: ReactNode;
  className?: string;
  loadingClassname?: string;
  emptyClassname?: string;
}

const Feed = forwardRef(
  (
    {
      group,
      filter,
      live = true,
      onlyRelays = true,
      newPost,
      className,
      outboxRelays = [],
      loadingClassname,
      emptyClassname,
      ...props
    }: FeedProps,
    ref: ForwardedRef<HTMLDivElement | null>,
  ) => {
    const relays =
      outboxRelays.length > 0 ? outboxRelays : group ? [group.relay] : [];
    const { eose, events } = useStream(filter, relays, live, onlyRelays);
    return (
      <div
        className={cn(
          "flex flex-col items-center w-full overflow-y-auto overflow-x-hidden pretty-scrollbar",
          className,
        )}
        ref={ref}
        {...props}
      >
        {events.length === 0 && !eose && (
          <Loading className={loadingClassname} />
        )}
        {events.length === 0 && eose ? (
          <Empty className={emptyClassname}>{newPost}</Empty>
        ) : null}
        {events.length > 0 && eose ? (
          <AnimatePresence initial={false}>
            <div className="flex flex-col gap-2 p-2">
              {newPost}
              <div className="flex flex-col gap-1 w-[calc(100vw-2rem)] sm:w-[420px] md:w-[510px]">
                {events.map((event) => (
                  <motion.div
                    key={event.id}
                    initial={{ scale: 0.2 }}
                    animate={{ scale: 1 }}
                  >
                    <FeedEmbed
                      event={event}
                      group={group}
                      canOpenDetails
                      relays={relays}
                    />
                  </motion.div>
                ))}
              </div>
            </div>
          </AnimatePresence>
        ) : null}
      </div>
    );
  },
);

export default Feed;

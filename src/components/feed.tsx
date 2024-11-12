import { forwardRef } from "react";
import type { ForwardedRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ReactNode } from "react";
import { NostrEvent } from "nostr-tools";
import { FeedEmbed } from "@/components/nostr/detail";
import { Empty } from "@/components/empty";
import { cn } from "@/lib/utils";
import type { Group } from "@/lib/types";

interface FeedProps {
  group: Group;
  newPost: ReactNode;
  eose: boolean;
  events: NostrEvent[];
  className?: string;
}

const Feed = forwardRef(
  (
    { group, newPost, eose, events, className }: FeedProps,
    ref: ForwardedRef<HTMLDivElement | null>,
  ) => {
    // todo: loading state
    return eose ? (
      <AnimatePresence initial={false}>
        <div
          className={cn(
            "flex flex-col items-center w-full overflow-y-auto overflow-x-hidden",
            className,
          )}
          style={{ height: `calc(100vh - 90px)` }}
          ref={ref}
        >
          {events.length === 0 && eose ? (
            <Empty>{newPost}</Empty>
          ) : (
            <div className="flex flex-col gap-2 p-2">
              {newPost}
              <div className="flex flex-col gap-1 w-[calc(100vw-2rem)] sm:w-[420px] md:w-[510px]">
                {events.map((event) => (
                  <motion.div
                    key={event.id}
                    initial={{ scale: 0.2 }}
                    animate={{ scale: 1 }}
                  >
                    <FeedEmbed event={event} group={group} canOpenDetails />
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>
      </AnimatePresence>
    ) : null;
  },
);

export default Feed;

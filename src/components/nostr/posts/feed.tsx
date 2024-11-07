import { motion, AnimatePresence } from "framer-motion";
import { forwardRef } from "react";
import type { ForwardedRef } from "react";
import { Megaphone } from "lucide-react";
import { NDKKind } from "@nostr-dev-kit/ndk";
import { useStream } from "@/lib/nostr";
import { Button } from "@/components/ui/button";
import { FeedEmbed } from "@/components/nostr/detail";
import { Empty } from "@/components/empty";
import { NewPost } from "@/components/new-post";
import { cn } from "@/lib/utils";
import type { Group } from "@/lib/types";

export const GroupPosts = forwardRef(
  (
    { group, className }: { group: Group; className?: string },
    ref: ForwardedRef<HTMLDivElement | null>,
  ) => {
    const filter = {
      kinds: [NDKKind.GroupNote],
      "#h": [group.id],
      limit: 100,
    };
    const { eose, events } = useStream(filter, [group.relay]);
    return eose ? (
      <AnimatePresence initial={false}>
        <div
          ref={ref}
          className={cn(
            "flex flex-col items-center w-full overflow-y-auto overflow-x-hidden",
            className,
          )}
          style={{ height: `calc(100vh - 90px)` }}
        >
          {events.length === 0 && eose ? (
            <Empty>
              <NewPost group={group}>
                <Button size="sm">
                  <Megaphone /> Say something
                </Button>
              </NewPost>
            </Empty>
          ) : (
            <div className="flex flex-col gap-2 p-2">
              <NewPost group={group}>
                <Button variant="outline" size="sm" className="w-full">
                  <Megaphone /> Say something
                </Button>
              </NewPost>
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
GroupPosts.displayName = "GroupPosts";

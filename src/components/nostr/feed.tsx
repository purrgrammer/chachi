import { forwardRef, useState } from "react";
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
import { HardDriveDownload } from "lucide-react";
import { Button } from "../ui/button";
import { useTranslation } from "react-i18next";

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
  slidingWindow?: number;
  feedClassName?: string;
  showReactions?: boolean;
  loadOlder?: boolean;
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
      feedClassName,
      slidingWindow,
      showReactions = true,
      loadOlder = false,
      ...props
    }: FeedProps,
    ref: ForwardedRef<HTMLDivElement | null>,
  ) => {
    const { t } = useTranslation();
    const [shouldShowOlder, setShouldShowOlder] = useState(false);
    const relays =
      outboxRelays.length > 0 ? outboxRelays : group ? [group.relay] : [];
    const { eose, events } = useStream(filter, relays, live, onlyRelays);
    const oldest = events.at(-1)?.created_at ?? 0;
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
            <div className={cn("flex flex-col gap-2 p-2", feedClassName)}>
              {newPost}
              <div className="flex flex-col gap-1 w-[calc(100dvw-2rem)] sm:w-[420px] md:w-[510px]">
                {(slidingWindow ? events.slice(0, slidingWindow) : events).map(
                  (event) => (
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
                        showReactions={showReactions}
                      />
                    </motion.div>
                  ),
                )}
              </div>
            </div>
            {loadOlder && oldest > 0 && !shouldShowOlder ? (
              <div className="flex items-center justify-center w-full my-8">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShouldShowOlder(true)}
                >
                  <HardDriveDownload />
                  {t("feed.load-older")}
                </Button>
              </div>
            ) : shouldShowOlder && oldest > 0 ? (
              <div className="pt-2">
                <Feed
                  filter={{ ...filter, until: oldest - 1 }}
                  live={false}
                  onlyRelays={onlyRelays}
                  outboxRelays={outboxRelays}
                  feedClassName={feedClassName}
                  loadOlder={loadOlder}
                  loadingClassname={loadingClassname}
                  emptyClassname={emptyClassname}
                />
              </div>
            ) : null}
          </AnimatePresence>
        ) : null}
      </div>
    );
  },
);

export default Feed;

import { forwardRef } from "react";
import type { ForwardedRef } from "react";
import { Button } from "@/components/ui/button";
import { Vote } from "lucide-react";
import { NewPoll } from "@/components/nostr/new-poll";
import Feed from "@/components/nostr/feed";
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
      limit: 10,
    };
    return (
      <Feed
        filter={filter}
        ref={ref}
        className={className}
        group={group}
        newPost={
          <NewPoll group={group}>
            <Button size="sm" variant="outline">
              <Vote /> Start a poll
            </Button>
          </NewPoll>
        }
      />
    );
  },
);
GroupPolls.displayName = "GroupPolls";

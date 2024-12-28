import { forwardRef } from "react";
import type { ForwardedRef } from "react";
import { Button } from "@/components/ui/button";
import { Vote } from "lucide-react";
import { NewPoll } from "@/components/nostr/new-poll";
import Feed from "@/components/nostr/feed";
import { POLL } from "@/lib/kinds";
import type { Group } from "@/lib/types";
import { useTranslation } from "react-i18next";

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
    const { t } = useTranslation();
    return (
      <Feed
        style={{ height: `calc(100vh - 80px)` }}
        filter={filter}
        ref={ref}
        className={className}
        group={group}
        live={true}
        onlyRelays={group.id === "_"}
        outboxRelays={[group.relay]}
        newPost={
          <NewPoll group={group}>
            <Button size="sm" variant="outline">
              <Vote /> {t("poll.start")}
            </Button>
          </NewPoll>
        }
      />
    );
  },
);
GroupPolls.displayName = "GroupPolls";

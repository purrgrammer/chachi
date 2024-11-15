import { forwardRef } from "react";
import type { ForwardedRef } from "react";
import { Megaphone } from "lucide-react";
import { NDKKind } from "@nostr-dev-kit/ndk";
import { Button } from "@/components/ui/button";
import Feed from "@/components/nostr/feed";
import { NewPost } from "@/components/new-post";
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
    return (
      <Feed
        style={{ height: `calc(100vh - 130px)` }}
        filter={filter}
        ref={ref}
        className={className}
        group={group}
        live={true}
        onlyRelays={group.id === "_"}
        outboxRelays={[group.relay]}
        newPost={
          <NewPost group={group}>
            <Button size="sm" variant="outline">
              <Megaphone /> Start a conversation
            </Button>
          </NewPost>
        }
      />
    );
  },
);
GroupPosts.displayName = "GroupPosts";

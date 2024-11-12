import { forwardRef } from "react";
import type { ForwardedRef } from "react";
import { Megaphone } from "lucide-react";
import { NDKKind } from "@nostr-dev-kit/ndk";
import { useStream } from "@/lib/nostr";
import { Button } from "@/components/ui/button";
import Feed from "@/components/feed";
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
    const { eose, events } = useStream(filter, [group.relay]);
    return (
      <Feed
        ref={ref}
        className={className}
        eose={eose}
        events={events}
        group={group}
        newPost={
          <NewPost group={group}>
            <Button size="sm">
              <Megaphone /> Say something
            </Button>
          </NewPost>
        }
      />
    );
  },
);
GroupPosts.displayName = "GroupPosts";

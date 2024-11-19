import { forwardRef } from "react";
import type { ForwardedRef } from "react";
import { Video } from "lucide-react";
import { NDKKind } from "@nostr-dev-kit/ndk";
import { Button } from "@/components/ui/button";
import Feed from "@/components/nostr/feed";
import { NewVideo } from "@/components/nostr/video";
import type { Group } from "@/lib/types";

export const GroupVideos = forwardRef(
  (
    { group, className }: { group: Group; className?: string },
    ref: ForwardedRef<HTMLDivElement | null>,
  ) => {
    const filter = {
      kinds: [NDKKind.HorizontalVideo, NDKKind.VerticalVideo],
      "#h": [group.id],
      limit: 50,
    };
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
          <NewVideo group={group}>
            <Button size="sm" variant="outline">
              <Video /> Post a video
            </Button>
          </NewVideo>
        }
      />
    );
  },
);
GroupVideos.displayName = "GroupVideos";

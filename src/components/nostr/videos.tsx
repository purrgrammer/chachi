import { forwardRef } from "react";
import type { ForwardedRef } from "react";
import { Video } from "lucide-react";
import { NDKKind } from "@nostr-dev-kit/ndk";
import { Button } from "@/components/ui/button";
import Feed from "@/components/nostr/feed";
import { NewVideo } from "@/components/nostr/video";
import type { Group } from "@/lib/types";
import { useTranslation } from "react-i18next";

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
    const { t } = useTranslation();
    return (
      <Feed
        style={{ height: `calc(100vh - 80px)` }}
        filter={filter}
        ref={ref}
        className={className}
        group={group}
        newPost={
          <NewVideo group={group}>
            <Button size="sm" variant="outline">
              <Video /> {t("video.post")}
            </Button>
          </NewVideo>
        }
      />
    );
  },
);
GroupVideos.displayName = "GroupVideos";

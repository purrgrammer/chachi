import { forwardRef } from "react";
import type { ForwardedRef } from "react";
import { Video } from "lucide-react";
import { NDKKind } from "@nostr-dev-kit/ndk";
import { Button } from "@/components/ui/button";
import Feed from "@/components/nostr/feed";
import { NewVideo } from "@/components/nostr/video";
import type { Group } from "@/lib/types";
import { useTranslation } from "react-i18next";
import { useGroup } from "@/lib/nostr/groups";

export const GroupVideos = forwardRef(
  (
    { group, className }: { group: Group; className?: string },
    ref: ForwardedRef<HTMLDivElement | null>,
  ) => {
    const { data: metadata } = useGroup(group);
    const includeOpPublications = metadata?.isCommunity;
    const filter = [
      {
        kinds: [NDKKind.HorizontalVideo, NDKKind.VerticalVideo],
        "#h": [group.id],
        limit: 50,
      },
      ...(includeOpPublications
        ? [
            {
              kinds: [NDKKind.HorizontalVideo, NDKKind.VerticalVideo],
              authors: [group.id],
            },
          ]
        : []),
    ];
    const { t } = useTranslation();
    return (
      <Feed
        style={{ height: `calc(100dvh - 80px)` }}
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

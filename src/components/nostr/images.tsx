import { forwardRef } from "react";
import type { ForwardedRef } from "react";
import { NDKKind } from "@nostr-dev-kit/ndk";
import { Button } from "@/components/ui/button";
import { ImageUp } from "lucide-react";
import { NewImage } from "@/components/nostr/image";
import Feed from "@/components/nostr/feed";
import type { Group } from "@/lib/types";
import { useTranslation } from "react-i18next";
import { useGroup } from "@/lib/nostr/groups";
export const GroupImages = forwardRef(
  (
    { group, className }: { group: Group; className?: string },
    ref: ForwardedRef<HTMLDivElement | null>,
  ) => {
    const { data: metadata } = useGroup(group);
    const includeOpPublications = metadata?.isCommunity;
    const filter = [
      {
        kinds: [NDKKind.Image],
        "#h": [group.id],
        limit: 30,
      },
      ...(includeOpPublications
        ? [
            {
              kinds: [NDKKind.Image],
              authors: [group.id],
            },
          ]
        : []),
    ];
    const { t } = useTranslation();
    return (
      <Feed
        style={{ height: `calc(100vh - 80px)` }}
        filter={filter}
        ref={ref}
        className={className}
        group={group}
        newPost={
          <NewImage group={group}>
            <Button size="sm" variant="outline">
              <ImageUp /> {t("image.post")}
            </Button>
          </NewImage>
        }
      />
    );
  },
);
GroupImages.displayName = "GroupImages";

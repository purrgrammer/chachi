import { forwardRef } from "react";
import type { ForwardedRef } from "react";
import { Megaphone } from "lucide-react";
import * as Kind from "@/lib/nostr/kinds";
import { Button } from "@/components/ui/button";
import Feed from "@/components/nostr/feed";
import { NewPost } from "@/components/new-post";
import type { Group } from "@/lib/types";
import { useTranslation } from "react-i18next";
import { useGroup } from "@/lib/nostr/groups";

export const GroupPosts = forwardRef(
  (
    { group, className }: { group: Group; className?: string },
    ref: ForwardedRef<HTMLDivElement | null>,
  ) => {
    const { data: metadata } = useGroup(group);
    const includeOpPublications = metadata?.isCommunity;
    const filter = [
      {
        kinds: [Kind.Thread],
        "#h": [group.id],
        limit: 50,
      },
      ...(includeOpPublications
        ? [
            {
              kinds: [Kind.Text, Kind.Thread],
              authors: [group.id],
              limit: 50,
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
          <NewPost group={group}>
            <Button size="sm" variant="outline">
              <Megaphone /> {t("post.start")}
            </Button>
          </NewPost>
        }
      />
    );
  },
);
GroupPosts.displayName = "GroupPosts";

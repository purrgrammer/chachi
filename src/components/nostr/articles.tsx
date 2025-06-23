import { forwardRef } from "react";
import type { ForwardedRef } from "react";
import { NDKKind } from "@nostr-dev-kit/ndk";
import Feed from "@/components/nostr/feed";
import { useGroup } from "@/lib/nostr/groups";
import type { Group } from "@/lib/types";

export const GroupArticles = forwardRef(
  (
    { group, className }: { group: Group; className?: string },
    ref: ForwardedRef<HTMLDivElement | null>,
  ) => {
    const { data: metadata } = useGroup(group);
    const includeOpPublications = metadata?.isCommunity;
    const filter = [
      {
        kinds: [NDKKind.Article],
        "#h": [group.id],
        limit: 100,
      },
      ...(includeOpPublications
        ? [
            {
              kinds: [NDKKind.Article],
              authors: [group.id],
            },
          ]
        : []),
    ];
    return (
      <Feed
        ref={ref}
        style={{ height: `calc(100dvh - 80px)` }}
        filter={filter}
        className={className}
        group={group}
      />
    );
  },
);
GroupArticles.displayName = "GroupArticles";

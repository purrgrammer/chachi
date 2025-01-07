import { forwardRef } from "react";
import type { ForwardedRef } from "react";
import { NDKKind } from "@nostr-dev-kit/ndk";
import { Button } from "@/components/ui/button";
import { ImageUp } from "lucide-react";
import { NewImage } from "@/components/nostr/image";
import Feed from "@/components/nostr/feed";
import type { Group } from "@/lib/types";
import { useTranslation } from "react-i18next";

export const GroupImages = forwardRef(
  (
    { group, className }: { group: Group; className?: string },
    ref: ForwardedRef<HTMLDivElement | null>,
  ) => {
    const filter = {
      kinds: [NDKKind.Image],
      "#h": [group.id],
      limit: 30,
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

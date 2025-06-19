import { NostrEvent } from "nostr-tools";
import { NameList } from "@/components/nostr/name-list";
import { cn } from "@/lib/utils";
import { Users } from "lucide-react";

export function ModeratedCommunitiesPreview({
  event,
  className,
}: {
  event: NostrEvent;
  className?: string;
}) {
  const name = event.tags.find((t) => t[0] === "name")?.[1];
  const description = event.tags.find((t) => t[0] === "description")?.[1];
  const image = event.tags.find((t) => t[0] === "image")?.[1];
  const moderators = event.tags.filter((t) => t[0] === "p").map((t) => t[1]);

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {image && (
        <img
          src={image}
          alt={name || "Community image"}
          className="w-full aspect-auto max-h-[210px] object-cover rounded-sm"
        />
      )}
      <div className="flex flex-col gap-0">
        <div className="flex items-center gap-2">
          <Users className="size-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold">
            {name || "Moderated Community"}
          </h3>
        </div>
        {description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {description}
          </p>
        )}
      </div>
      {moderators.length > 0 && (
        <div className="flex flex-col gap-1">
          <h4 className="text-xs font-light text-muted-foreground uppercase">
            Moderators
          </h4>
          <NameList
            pubkeys={moderators}
            avatarClassName="size-4"
            textClassName="text-sm"
          />
        </div>
      )}
    </div>
  );
}

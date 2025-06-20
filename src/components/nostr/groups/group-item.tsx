import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useGroup } from "@/lib/nostr/groups";
import { groupURL } from "@/lib/groups";
import type { Group } from "@/lib/types";
import { cn } from "@/lib/utils";

export function GroupItem({
  group,
  className,
}: {
  group: Group;
  className?: string;
}) {
  const { data: metadata } = useGroup(group);

  return (
    <Link
      to={groupURL(group)}
      className={cn(
        "flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors",
        className,
      )}
    >
      <Avatar className="size-8 shrink-0">
        <AvatarImage src={metadata?.picture} className="object-cover" />
        <AvatarFallback className="text-xs">
          {metadata?.name?.charAt(0) || group.id.charAt(0)}
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-col min-w-0">
        <span className="font-medium text-sm truncate">
          {metadata?.name || group.id.slice(0, 8)}
        </span>
        {metadata?.about && (
          <span className="text-xs text-muted-foreground truncate">
            {metadata.about}
          </span>
        )}
      </div>
    </Link>
  );
}

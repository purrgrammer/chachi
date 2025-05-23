import { groupURL } from "@/lib/groups";
import { useGroup } from "@/lib/nostr/groups";
import { Group } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

export function GroupLink({
  group,
  classNames,
}: {
  group: Group;
  classNames?: { avatar: string; name: string };
}) {
  const { data: metadata } = useGroup(group);
  return metadata ? (
    <Link
      to={groupURL(group)}
      className="text-xs hover:cursor-pointer hover:underline hover:decoration-dotted"
    >
      <div className="flex flex-row items-center gap-1">
        {metadata.picture ? (
          <img
            src={metadata.picture}
            className={cn("size-3 rounded-full", classNames?.avatar)}
          />
        ) : null}
        <span className={cn("text-sm", classNames?.name)}>{metadata.name}</span>
      </div>
    </Link>
  ) : null;
}

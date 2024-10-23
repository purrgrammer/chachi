import { NostrEvent } from "nostr-tools";
import type { Group } from "@/lib/types";

export function GroupMetadata({
  event,
  group,
}: {
  event: NostrEvent;
  group: Group;
}) {
  const name = event.tags.find((t) => t[0] === "name")?.[1];
  const picture = event.tags.find((t) => t[0] === "picture")?.[1];
  console.log("GROUP SHARED IN ", group);

  return (
    <div className="flex flex-row gap-2">
      {picture ? <img src={picture} className="size-6 rounded-full" /> : null}
      <h1 className="text-lg">{name}</h1>
    </div>
  );
}

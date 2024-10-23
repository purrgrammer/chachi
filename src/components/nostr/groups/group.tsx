import type { NostrEvent } from "nostr-tools";
import { cn } from "@/lib/utils";

export function Group({
  event,
  className,
}: {
  event: NostrEvent;
  className?: string;
}) {
  //const group = useGroup(event.group);
  //const { data: metadata } = useGroup(group);
  const name = "group";
  return (
    <h2 className={cn("text-lg font-semibold", className)}>
      {name || event.id.slice(0, 6)}
    </h2>
  );
}

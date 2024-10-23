import type { NostrEvent } from "nostr-tools";
import { RichText } from "@/components/rich-text";
import { Button } from "@/components/ui/button";
import type { Group } from "@/lib/types";

export function Poll({
  event,
  group,
  className,
}: {
  event: NostrEvent;
  group: Group;
  className?: string;
}) {
  //const relays = event.tags.filter((t) => t[0] === "relay").map((t) => t[2]);
  const options = event.tags
    .filter((t) => t[0] === "option")
    .map((t) => ({ id: t[1], text: t[2] }));
  //const pollType =
  //  event.tags.find((t) => t[0] === "polltype")?.[1] || "singlechoice";
  //const endsAt = event.tags.find((t) => t[0] === "endsAt")?.[1];
  //const pow = Number(event.tags.find((t) => t[0] === "PoW")?.[1]) || 0;
  return (
    <>
      <RichText tags={event.tags} group={group} className={className}>
        {event.content}
      </RichText>
      <div className="p-2 flex flex-col gap-2">
        {options.map((option) => (
          <div key={option.id}>
            <Button disabled variant="outline" size="sm">
              {option.text}
            </Button>
          </div>
        ))}
      </div>
    </>
  );
}

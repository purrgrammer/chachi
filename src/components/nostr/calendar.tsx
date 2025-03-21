import { MapPin, Calendar } from "lucide-react";
import { NostrEvent } from "nostr-tools";
import { RichText } from "@/components/rich-text";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/time";
import type { Group } from "@/lib/types";

export function CalendarEvent({
  event,
  group,
  className,
}: {
  event: NostrEvent;
  group?: Group;
  className?: string;
}) {
  // todo: RSVP, calendar
  const title = event.tags.find((tag) => tag[0] === "title")?.[1];
  const summary =
    event.content || event.tags.find((tag) => tag[0] === "description")?.[1];
  const image = event.tags.find((tag) => tag[0] === "image")?.[1];
  const startDate = event.tags.find((tag) => tag[0] === "start")?.[1];
  const tz = event.tags.find((tag) => tag[0] === "start_tzid")?.[1];
  const location = event.tags.find((tag) => tag[0] === "location")?.[1];
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {image ? (
        <img
          src={image}
          className="w-full aspect-auto max-h-[210px] object-cover"
        />
      ) : null}

      <div className="flex flex-col gap-2">
        <h3 className="text-lg">{title}</h3>
        <ul className="flex flex-col gap-1 ml-3">
          {startDate && (
            <li className="flex flex-row gap-2 items-center">
              <Calendar className="size-5 text-muted-foreground" />{" "}
              <span className="text-sm">
                {formatDateTime(Number(startDate), tz)}
              </span>
            </li>
          )}
          {location && (
            <li className="flex flex-row gap-2 items-center">
              <MapPin className="size-5 text-muted-foreground" />{" "}
              <a
                className="text-sm underline decoration-dotted line-clamp-1"
                href={`https://www.google.com/maps/search/?api=1&query=${location}`}
                target="_blank"
                rel="noreferrer"
              >
                {location}
              </a>
            </li>
          )}
        </ul>
        {summary ? (
          <RichText className="text-sm" tags={event.tags} group={group}>
            {summary}
          </RichText>
        ) : null}
      </div>
    </div>
  );
}

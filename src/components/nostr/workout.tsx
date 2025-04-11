import { Clock, Mountain, Route, Footprints } from "lucide-react";
import { NostrEvent } from "nostr-tools";
import { RichText } from "@/components/rich-text";
import type { Group } from "@/lib/types";
import type {
  RichTextOptions,
  RichTextClassnames,
} from "@/components/rich-text";

interface WorkoutProps {
  event: NostrEvent;
  group?: Group;
  options?: RichTextOptions;
  classNames?: RichTextClassnames;
}

export function Workout({ event, group, options, classNames }: WorkoutProps) {
  const workoutTag = event.tags.find((t) => t[0] === "workout")?.[1];
  const distanceTag = event.tags.find((t) => t[0] === "distance");
  const durationTag = event.tags.find((t) => t[0] === "duration")?.[1];
  const elevationTag = event.tags.find((t) => t[0] === "elevation_gain");

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Footprints className="size-4 text-muted-foreground" />
        <span className="font-medium">{workoutTag}</span>
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Route className="size-4 text-muted-foreground" />
          <span>
            {distanceTag?.[1]} {distanceTag?.[2]}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="size-4 text-muted-foreground" />
          <span>{durationTag}</span>
        </div>
        {elevationTag && (
          <div className="flex items-center gap-2">
            <Mountain className="size-4 text-muted-foreground" />
            <span>
              {elevationTag[1]} {elevationTag[2]}
            </span>
          </div>
        )}
      </div>
      <RichText
        options={options}
        group={group}
        tags={event.tags}
        classNames={classNames}
      >
        {event.content}
      </RichText>
    </div>
  );
}

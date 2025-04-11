import { Dumbbell, ListChecks, Scale, Target, Info } from "lucide-react";
import { NostrEvent } from "nostr-tools";
import { RichText } from "@/components/rich-text";
import type { Group } from "@/lib/types";
import type {
  RichTextOptions,
  RichTextClassnames,
} from "@/components/rich-text";
import { Markdown } from "../markdown";

interface WorkoutTemplateProps {
  event: NostrEvent;
  group?: Group;
  options?: RichTextOptions;
  classNames?: RichTextClassnames;
}

export function WorkoutTemplate({
  event,
  group,
  options,
  classNames,
}: WorkoutTemplateProps) {
  const titleTag = event.tags.find((t) => t[0] === "title")?.[1];
  const descriptionTag = event.tags.find((t) => t[0] === "description")?.[1];
  const formatTag =
    event.tags.find((t) => t[0] === "format")?.[1]?.split(",") ?? [];
  const formatUnitsTag =
    event.tags.find((t) => t[0] === "format_units")?.[1]?.split(",") ?? [];
  const equipmentTag = event.tags.find((t) => t[0] === "equipment")?.[1];
  const difficultyTag = event.tags.find((t) => t[0] === "difficulty")?.[1];
  const durationTag = event.tags.find((t) => t[0] === "duration")?.[1];
  const targetMusclesTag =
    event.tags.find((t) => t[0] === "target_muscles")?.[1]?.split(",") ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Dumbbell className="size-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold">{titleTag}</h3>
        </div>
        {descriptionTag && (
          <Markdown
            group={group}
            tags={event.tags}
            className="text-sm text-muted-foreground"
          >
            {descriptionTag}
          </Markdown>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          {formatTag.map((format, index) => {
            const unit = formatUnitsTag[index];
            let icon = <ListChecks className="size-4 text-muted-foreground" />;

            switch (format) {
              case "weight":
                icon = <Scale className="size-4 text-muted-foreground" />;
                break;
              case "reps":
                icon = <Target className="size-4 text-muted-foreground" />;
                break;
              case "rpe":
                icon = <ListChecks className="size-4 text-muted-foreground" />;
                break;
              case "set_type":
                icon = <ListChecks className="size-4 text-muted-foreground" />;
                break;
            }

            return (
              <div key={format} className="flex items-center gap-2">
                {icon}
                <span className="capitalize">
                  {format}: {unit}
                </span>
              </div>
            );
          })}
        </div>

        <div className="flex flex-col gap-2">
          {equipmentTag && (
            <div className="flex items-center gap-2">
              <Dumbbell className="size-4 text-muted-foreground" />
              <span className="capitalize">Equipment: {equipmentTag}</span>
            </div>
          )}

          {difficultyTag && (
            <div className="flex items-center gap-2">
              <Info className="size-4 text-muted-foreground" />
              <span className="capitalize">Difficulty: {difficultyTag}</span>
            </div>
          )}

          {durationTag && (
            <div className="flex items-center gap-2">
              <Info className="size-4 text-muted-foreground" />
              <span className="capitalize">Duration: {durationTag}</span>
            </div>
          )}

          {targetMusclesTag.length > 0 && (
            <div className="flex items-center gap-2">
              <Target className="size-4 text-muted-foreground" />
              <span className="capitalize">
                Target Muscles: {targetMusclesTag.join(", ")}
              </span>
            </div>
          )}
        </div>
      </div>

      {event.content && (
        <RichText
          options={options}
          group={group}
          tags={event.tags}
          classNames={classNames}
        >
          {event.content}
        </RichText>
      )}
    </div>
  );
}

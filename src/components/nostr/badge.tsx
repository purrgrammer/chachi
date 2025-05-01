import { Award } from "lucide-react";
import { NostrEvent } from "nostr-tools";
import { RichText } from "../rich-text";

export default function Badge({ event }: { event: NostrEvent }) {
  const image = event.tags.find((t) => t[0] === "image")?.[1];
  const name = event.tags.find((t) => t[0] === "name")?.[1];
  const description = event.tags.find((t) => t[0] === "description")?.[1];
  const thumb = event.tags.find((t) => t[0] === "thumb")?.[1];
  const img = image || thumb;
  return (
    <div className="flex flex-col gap-2 w-full items-center justify-center">
      {img ? (
        <img src={img} alt={name} className="size-32 sm:size-48 lg:size-64 rounded-full" />
      ) : null}
      <div className="flex flex-row gap-1 items-center justify-center">
        <Award className="size-6 text-muted-foreground" />
        <h3 className="text-2xl font-semibold text-center">{name}</h3>
      </div>
      {description ? (
        <RichText
          tags={event.tags}
          className="text-md text-gray-500 text-center"
        >
          {description}
        </RichText>
      ) : null}
    </div>
  );
}

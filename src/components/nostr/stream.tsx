import { useState } from "react";
import type { NostrEvent } from "nostr-tools";
import ReactPlayer from "react-player";
import { Radio, Play } from "lucide-react";
import Hashtags from "@/components/nostr/hashtags";
import { Button } from "@/components/ui/button";
import {
  RichText,
  RichTextOptions,
  RichTextClassnames,
} from "@/components/rich-text";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Group } from "@/lib/types";

export function Stream({
  event,
  group,
  className,
  classNames,
  options = {},
}: {
  event: NostrEvent;
  group: Group;
  className?: string;
  options?: RichTextOptions;
  classNames?: RichTextClassnames;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const title = event.tags.find((t) => t[0] === "title")?.[1];
  const summary = event.tags.find((t) => t[0] === "summary")?.[1];
  const image = event.tags.find((t) => t[0] === "image")?.[1];
  const isLive = event.tags.find((t) => t[0] === "status")?.[1] === "live";
  const stream = event.tags.find((t) => t[0] === "streaming")?.[1];
  return (
    <div className="flex flex-col gap-1">
      <div className="mb-1 relative">
        {image && isLive && stream ? (
          isPlaying ? (
            <ReactPlayer
              url={stream}
              hlsOptions={{ autoStartLoad: false }}
              controls={true}
              className="aspect-video rounded-sm"
              width="100%"
              height="100%"
            />
          ) : (
            <>
              <img
                alt={title}
                src={image}
                className="aspect-video rounded-sm"
              />
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <Button
                  size="play"
                  className="transition-all hover:scale-125"
                  onClick={() => setIsPlaying(true)}
                >
                  <Play />
                </Button>
              </div>
            </>
          )
        ) : image ? (
          <img alt={title} src={image} className="aspect-video rounded-sm" />
        ) : null}
        {isLive ? (
          <Badge variant="live" className="absolute top-1 right-1">
            <div className="flex flex-row items-center gap-1">
              <Radio className="size-4 animate-pulse" />
              <span className="hidden md:inline text-xs uppercase font-light">
                Live
              </span>
            </div>
          </Badge>
        ) : null}
      </div>
      {title ? <h3 className="text-lg font-semibold">{title}</h3> : null}
      {summary ? (
        <RichText
          tags={event.tags}
          group={group}
          className={cn(
            "text-sm text-muted-foreground line-clamp-3",
            className,
          )}
          classNames={classNames}
          options={options}
        >
          {summary}
        </RichText>
      ) : null}
      <Hashtags event={event} />
    </div>
  );
}

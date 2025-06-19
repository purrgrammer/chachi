import { useState } from "react";
import type { NostrEvent } from "nostr-tools";
import ReactPlayer from "react-player";
import { Radio, Play, Square, Calendar } from "lucide-react";
import { useTranslation } from "react-i18next";
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
  group?: Group;
  className?: string;
  options?: RichTextOptions;
  classNames?: RichTextClassnames;
}) {
  const { t } = useTranslation();
  const [isPlaying, setIsPlaying] = useState(false);
  const title = event.tags.find((t) => t[0] === "title")?.[1];
  const summary = event.tags.find((t) => t[0] === "summary")?.[1];
  const image = event.tags.find((t) => t[0] === "image")?.[1];
  const status = event.tags.find((t) => t[0] === "status")?.[1];
  const stream = event.tags.find((t) => t[0] === "streaming")?.[1];
  const recording = event.tags.find((t) => t[0] === "recording")?.[1];

  const isLive = status === "live";
  const isPlanned = status === "planned";
  const hasEnded = status === "ended" || Boolean(recording);
  return (
    <div className="flex flex-col gap-1">
      <div className="mb-1 relative">
        {image && ((isLive && stream) || (hasEnded && recording)) ? (
          isPlaying ? (
            <ReactPlayer
              url={isLive ? stream : recording}
              controls={true}
              playing={isPlaying}
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
                {t("stream.live-updates")}
              </span>
            </div>
          </Badge>
        ) : hasEnded ? (
          <Badge variant="secondary" className="absolute top-1 right-1">
            <div className="flex flex-row items-center gap-1">
              <Square className="size-4" />
              <span className="hidden md:inline text-xs uppercase font-light">
                {t("stream.ended")}
              </span>
            </div>
          </Badge>
        ) : isPlanned ? (
          <Badge variant="outline" className="absolute top-1 right-1">
            <div className="flex flex-row items-center gap-1">
              <Calendar className="size-4" />
              <span className="hidden md:inline text-xs uppercase font-light">
                {t("stream.planned")}
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
      <Hashtags event={event} className="mt-2" />
    </div>
  );
}

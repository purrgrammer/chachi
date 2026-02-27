import { useState, useRef, ReactNode } from "react";
import { toast } from "sonner";
import { Video } from "lucide-react";
import { NostrEvent } from "nostr-tools";
import * as Kind from "@/lib/nostr/kinds";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { UploadVideo } from "@/components/upload-video";
import { AutocompleteTextarea } from "@/components/autocomplete-textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useCanSign } from "@/lib/account";
import { Button } from "@/components/ui/button";
import { randomId } from "@/lib/id";
import { getImetaValue, blobToImeta, UploadedBlob } from "@/lib/media";
import type { Group, Emoji } from "@/lib/types";
import { useTranslation } from "react-i18next";
import { usePublishEvent } from "@/lib/nostr/publishing";

export function NewVideo({
  group,
  children,
  onSuccess,
}: {
  group?: Group;
  children?: ReactNode;
  onSuccess?: (ev: NostrEvent) => void;
}) {
  const ref = useRef<HTMLVideoElement | null>(null);
  // todo: video recordings
  const [customEmoji, setCustomEmoji] = useState<Emoji[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [blob, setBlob] = useState<UploadedBlob | null>(null);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const canSign = useCanSign();
  const { t } = useTranslation();
  const publish = usePublishEvent();

  function onOpenChange(open: boolean) {
    if (!open) {
      setBlob(null);
      setTitle("");
      setDescription("");
    }
    setShowDialog(open);
  }

  function onLoadedMetadata() {
    if (ref.current) {
      const width = ref.current?.videoWidth ?? 0;
      const height = ref.current?.videoHeight ?? 0;
      setWidth(width);
      setHeight(height);
    }
  }

  async function poast() {
    if (!blob) return;
    try {
      setIsPosting(true);
      const tags: string[][] = [
        ["d", randomId()],
        ...(group ? [["h", group.id, group.relay]] : []),
        ...(group?.id === "_" ? [["-"]] : []),
        // todo: fallbacks, size
        ...(title ? [["title", title]] : []),
      ];
      if (blob.url) {
        tags.push(blobToImeta(blob), ["url", blob.url]);
      }
      if (blob.type) {
        tags.push(["m", blob.type]);
      }
      customEmoji.filter((e) => e.image).forEach((e) => {
        tags.push(["emoji", e.name, e.image!]);
      });
      const template = {
        kind: height > width ? Kind.VerticalVideo : Kind.HorizontalVideo,
        content: description.trim(),
        tags,
        created_at: Math.floor(Date.now() / 1000),
      };
      const publishedEvent = await publish(template, group ? [group.relay] : []);
      toast.success(t("video.publish.success"));
      onSuccess?.(publishedEvent);
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error(t("video.publish.error"));
    } finally {
      setIsPosting(false);
    }
  }

  return (
    <Dialog open={showDialog} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        {children || (
          <Button disabled={!canSign}>
            <Video /> {t("post.action")}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t("video.new")}</DialogTitle>
        </DialogHeader>
        {blob ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <Label>{t("video.title.label")}</Label>
              <div className="px-2">
                <Input
                  placeholder={t("video.title.placeholder")}
                  onChange={(e) => setTitle(e.target.value.trim())}
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label>{t("video.description.label")}</Label>
              <AutocompleteTextarea
                message={description}
                setMessage={setDescription}
                group={group}
                placeholder={t("video.description.placeholder")}
                minRows={2}
                maxRows={6}
                onCustomEmojisChange={setCustomEmoji}
              />
            </div>
            <video
              ref={ref}
              onLoadedMetadata={onLoadedMetadata}
              src={blob.url}
              controls
              preload="metadata"
              className={`rounded-md ${width > height ? "aspect-video" : "aspect-auto"}`}
            />
            <Button disabled={isPosting} onClick={poast}>
              <Video />
              {t("post.action")}
            </Button>
          </div>
        ) : (
          <UploadVideo onUpload={setBlob} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function VideoEvent({
  event,
  className,
}: {
  event: NostrEvent;
  className?: string;
}) {
  const imeta = event.tags.find((t) => t[0] === "imeta") || [];
  const title = event.tags.find((t) => t[0] === "title")?.[1];
  const thumbnail = event.tags.find((t) => t[0] === "thumb")?.[1];
  const url =
    getImetaValue(imeta, "url") ||
    event.tags.find((t) => t[0] === "url")?.[1]?.trim();
  const type = (
    getImetaValue(imeta, "m") || event.tags.find((t) => t[0] === "m")?.[1]
  )?.replace("quicktime", "mov");
  // todo: fail if no URL found
  return (
    <div className="flex flex-col gap-2">
      {title ? (
        <h3 className="text-lg font-semibold line-clamp-1">{title}</h3>
      ) : null}
      <video
        className={className}
        controls
        preload="metadata"
        poster={thumbnail}
        src={url}
        // @ts-expect-error: for some reason `type` is not an attribute of video type
        type={type || "video/mp4"}
      />
    </div>
  );
}

export function VerticalVideo({ event }: { event: NostrEvent }) {
  return <VideoEvent event={event} className="rounded-sm aspect-[9/16]" />;
}

export function HorizontalVideo({ event }: { event: NostrEvent }) {
  return <VideoEvent event={event} className="rounded-sm aspect-video" />;
}

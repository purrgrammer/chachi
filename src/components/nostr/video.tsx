import { useState, useRef, ReactNode } from "react";
import { toast } from "sonner";
import { Video } from "lucide-react";
import { NostrEvent } from "nostr-tools";
import { NDKEvent, NDKKind } from "@nostr-dev-kit/ndk";
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
import { useNDK } from "@/lib/ndk";
import { useRelaySet } from "@/lib/nostr";
import { useCanSign } from "@/lib/account";
import { Button } from "@/components/ui/button";
import { randomId } from "@/lib/id";
import type { UploadedBlob } from "@/lib/media";
import type { Group, Emoji } from "@/lib/types";

export function NewVideo({
  group,
  children,
  onSuccess,
}: {
  group: Group;
  children?: ReactNode;
  onSuccess?: (ev: NostrEvent) => void;
}) {
  const ndk = useNDK();
  const ref = useRef<HTMLVideoElement | null>(null);
  // todo: video recordings
  const [customEmoji, setCustomEmoji] = useState<Emoji[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [blob, setBlob] = useState<UploadedBlob | null>(null);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const relaySet = useRelaySet([group.relay]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const canSign = useCanSign();

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
      const ev = new NDKEvent(ndk, {
        kind: height > width ? NDKKind.VerticalVideo : NDKKind.HorizontalVideo,
        content: description.trim(),
        tags: [
          ["d", randomId()],
	  ["h", group.id, group.relay],
          // todo: fallbacks, size
          ...(title ? [["title", title]] : []),
          [
            "imeta",
            `url ${blob.url}`,
            `x ${blob.sha256}`,
            `m ${blob.type}`,
            `dim ${width}x${height}`,
          ],
          ["url", blob.url],
          ["m", blob.type],
	  ...(customEmoji.map((e) => ["emoji", e.name, e.image] as string[])),
        ],
      } as NostrEvent);
      await ev.publish(relaySet);
      toast.success("Video posted");
      onSuccess?.(ev.rawEvent() as NostrEvent);
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to post video");
    } finally {
      setIsPosting(false);
    }
  }

  return (
    <Dialog open={showDialog} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{children ||

          <Button disabled={!canSign}>
            <Video /> Post
          </Button>

      }</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>New video</DialogTitle>
        </DialogHeader>
        {blob ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <Label>Title</Label>
              <Input placeholder="Add a title" />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Description</Label>
              <AutocompleteTextarea
		message={description}
		setMessage={setDescription}
                group={group}
                placeholder="Add a description"
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
            Post
          </Button>
          </div>
        ) : (
          <UploadVideo onUpload={setBlob} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function getImetaValue(imeta: string[], item: string) {
  const value = imeta.find((t) => t.startsWith(item));
  return value ? value.split(" ")[1] : "";
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
  return <VideoEvent event={event} className="aspect-[9/16] rounded-sm" />;
}

export function HorizontalVideo({ event }: { event: NostrEvent }) {
  return <VideoEvent event={event} className="aspect-video rounded-sm" />;
}

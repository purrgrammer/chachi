import { useState, useRef, ReactNode } from "react";
import { toast } from "sonner";
import { Video } from "lucide-react";
import { NostrEvent } from "nostr-tools";
import { NDKEvent, NDKKind } from "@nostr-dev-kit/ndk";
import { RichText } from "@/components/rich-text";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { UploadImage } from "@/components/upload-image";
import { AutocompleteTextarea } from "@/components/autocomplete-textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useNDK } from "@/lib/ndk";
import { useRelaySet } from "@/lib/nostr";
import { useCanSign } from "@/lib/account";
import { Button } from "@/components/ui/button";
import { getImetaValue, blobToImeta, UploadedBlob } from "@/lib/media";
import type { Group, Emoji } from "@/lib/types";
import { useTranslation } from "react-i18next";

export function NewImage({
  group,
  children,
  onSuccess,
}: {
  group: Group;
  children?: ReactNode;
  onSuccess?: (ev: NostrEvent) => void;
}) {
  const ndk = useNDK();
  const ref = useRef<HTMLImageElement | null>(null);
  const [customEmoji, setCustomEmoji] = useState<Emoji[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [blob, setBlob] = useState<UploadedBlob | null>(null);
  const relaySet = useRelaySet([group.relay]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const canSign = useCanSign();
  const { t } = useTranslation();

  function onOpenChange(open: boolean) {
    if (!open) {
      setBlob(null);
      setTitle("");
      setDescription("");
    }
    setShowDialog(open);
  }

  async function poast() {
    if (!blob) return;
    try {
      setIsPosting(true);
      const ev = new NDKEvent(ndk, {
        kind: NDKKind.Image,
        content: description.trim(),
        tags: [
          ["h", group.id, group.relay],
          ...(group.id === "_" ? [["-"]] : []),
          // todo: fallbacks, size
          ...(title ? [["title", title]] : []),
          blobToImeta(blob),
          ["m", blob.type],
          ["x", blob.sha256],
          // todo: hashtags, location, geohash, language
          ...customEmoji.map((e) => ["emoji", e.name, e.image] as string[]),
        ],
      } as NostrEvent);
      await ev.sign();
      await ev.publish(relaySet);
      toast.success(t("image.publish.success"));
      onSuccess?.(ev.rawEvent() as NostrEvent);
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error(t("image.publish.error"));
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
          <DialogTitle>{t("image.new")}</DialogTitle>
        </DialogHeader>
        {blob ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <Label>{t("image.title.label")}</Label>
              <div className="px-2">
                <Input
                  placeholder={t("image.title.placeholder")}
                  onChange={(e) => setTitle(e.target.value.trim())}
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label>{t("image.description.label")}</Label>
              <AutocompleteTextarea
                message={description}
                setMessage={setDescription}
                group={group}
                placeholder={t("image.description.placeholder")}
                minRows={2}
                maxRows={6}
                onCustomEmojisChange={setCustomEmoji}
              />
            </div>
            <img ref={ref} src={blob.url} className="rounded-md aspect-image" />
            <Button disabled={isPosting} onClick={poast}>
              <Video />
              {t("post.action")}
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-center">
            <UploadImage onUpload={setBlob} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function Image({ event, group }: { event: NostrEvent; group: Group }) {
  const imeta = event.tags.find((t) => t[0] === "imeta") || [];
  const title = event.tags.find((t) => t[0] === "title")?.[1];
  const url =
    getImetaValue(imeta, "url") ||
    event.tags.find((t) => t[0] === "url")?.[1]?.trim();
  // todo: fail if no URL found
  // todo: aspect ratio, vertical vs horizontal images
  return (
    <div className="flex flex-col gap-2">
      {title ? (
        <h3 className="text-lg font-semibold line-clamp-1">{title}</h3>
      ) : null}
      <div className="-ml-4 -mr-4">
        <img className="aspect-image" src={url} />
      </div>
      <RichText tags={event.tags} group={group}>
        {event.content}
      </RichText>
    </div>
  );
}

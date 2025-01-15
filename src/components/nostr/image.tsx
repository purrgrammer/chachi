import { useState, useRef, useMemo, ReactNode } from "react";
import { toast } from "sonner";
import { Video, Eye } from "lucide-react";
import { NostrEvent } from "nostr-tools";
import { Blurhash } from "react-blurhash";
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
import Gallery from "@/components/gallery";
import { blobToImeta, parseImeta, UploadedBlob } from "@/lib/media";
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

function BlurhashPreview({
  alt,
  url,
  blurhash,
  maxWidth,
  width,
  height,
}: {
  alt?: string;
  url: string;
  blurhash: string;
  maxWidth: number;
  width: number;
  height: number;
}) {
  const { t } = useTranslation();
  const [showOriginalImage, setShowOriginalImage] = useState(false);
  const maxHeight = (height / width) * maxWidth;
  function reveal() {
    setShowOriginalImage(true);
  }
  return (
    <div
      className={`relative bg-accent ${showOriginalImage ? "" : "cursor-all-scroll"}`}
      style={{
        width: `${maxWidth}px`,
        height: `${maxHeight}px`,
      }}
    >
      {showOriginalImage ? (
        <img
          alt={alt}
          className="aspect-image"
          src={url}
          style={{
            width: `${maxWidth}px`,
            height: `${maxHeight}px`,
          }}
        />
      ) : (
        <>
          <Button
            variant="secondary"
            className="z-10 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
            onClick={reveal}
          >
            <Eye />
            {t("media.reveal")}
          </Button>
          <Blurhash
            hash={blurhash}
            width={maxWidth}
            height={(height / width) * maxWidth}
          />
        </>
      )}
    </div>
  );
}

function Imeta({ imeta }: { imeta: string[] }) {
  const parsed = useMemo(() => (imeta ? parseImeta(imeta) : null), [imeta]);
  const ref = useRef<HTMLDivElement | null>(null);
  const url = parsed?.url;
  const blurhash = parsed?.blurhash;
  const alt = parsed?.alt;
  return blurhash && parsed?.width && parsed?.height && url ? (
    <div ref={ref} className="min-w-[286px] sm:min-w-[446px]">
      {ref.current ? (
        <BlurhashPreview
          alt={alt}
          url={url}
          maxWidth={ref.current.clientWidth}
          blurhash={blurhash}
          width={parsed.width}
          height={parsed.height}
        />
      ) : null}
    </div>
  ) : url ? (
    <img alt={alt} className="aspect-image" src={url} />
  ) : parsed?.fallback ? (
    <img alt={alt} className="aspect-image" src={parsed.fallback} />
  ) : (
    <span className="text-sm text-muted-foreground">Image URL not found</span>
  );
}

export function Image({ event, group }: { event: NostrEvent; group: Group }) {
  const imetas = event.tags.filter((t) => t[0] === "imeta");
  const imeta = imetas[0];
  const isGallery = imetas.length > 1;
  const title = event.tags.find((t) => t[0] === "title")?.[1];
  return (
    <div className="flex flex-col gap-2">
      {title ? (
        <h3 className="text-lg font-semibold line-clamp-1">{title}</h3>
      ) : null}
      <div className="-ml-4 -mr-4">
        {isGallery ? <Gallery imetas={imetas} /> : <Imeta imeta={imeta} />}
      </div>
      <RichText tags={event.tags} group={group}>
        {event.content}
      </RichText>
    </div>
  );
}

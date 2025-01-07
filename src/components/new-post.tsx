import { useState } from "react";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { NostrEvent } from "nostr-tools";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  //DialogFooter,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { UploadFile } from "@/components/upload-file";
import { AutocompleteTextarea } from "@/components/autocomplete-textarea";
import { NDKEvent, NDKKind } from "@nostr-dev-kit/ndk";
import { useNDK } from "@/lib/ndk";
import { useRelaySet } from "@/lib/nostr";
import { useCanSign } from "@/lib/account";
import type { UploadedBlob } from "@/lib/media";
import { Embed } from "@/components/nostr/detail";
import type { Group, Emoji } from "@/lib/types";
import { useTranslation } from "react-i18next";

export function NewPost({
  group,
  children,
  kind = NDKKind.GroupNote,
  action = "Post",
  //TODO add translation
  title = "New post",
  reply,
  onSucess,
}: {
  group: Group;
  kind?: NDKKind;
  children?: React.ReactNode;
  action?: string;
  title?: string;
  reply?: NostrEvent;
  onSucess?: (ev: NostrEvent) => void;
}) {
  const [showDialog, setShowDialog] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [message, setMessage] = useState("");
  const [customEmoji, setCustomEmoji] = useState<Emoji[]>([]);
  const [blobs, setBlobs] = useState<UploadedBlob[]>([]);
  const ndk = useNDK();
  const relaySet = useRelaySet([group.relay]);
  const canSign = useCanSign();
  const { t } = useTranslation();
  console.log("BLOBS", blobs);

  function onFileUpload(blob: UploadedBlob) {
    setBlobs([...blobs, blob]);
    setMessage(`${message} ${blob.url}`);
  }

  async function post() {
    try {
      setIsPosting(true);
      if (message.trim()) {
        const ev = new NDKEvent(ndk, {
          kind,
          content: message.trim(),
          tags: [
            ["h", group.id, group.relay],
            ...(group.id === "_" ? [["-"]] : []),
          ],
        } as NostrEvent);
        // todo: 1111 replies
        for (const e of customEmoji) {
          ev.tags.push(["emoji", e.name, e.image!]);
        }
        // todo: imeta tags
        await ev.publish(relaySet);
        onSucess?.(ev.rawEvent() as NostrEvent);
        setShowDialog(false);
        setMessage("");
        toast.success(t("post.success"));
      }
    } catch (err) {
      console.error(err);
      toast.error(t("post.error"));
    } finally {
      setIsPosting(false);
    }
  }

  function onOpenChange(open: boolean) {
    setShowDialog(open);
    if (!open) {
      setMessage("");
    }
  }

  // todo: optional title

  return (
    <Dialog open={showDialog} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        {children || (
          <Button disabled={!canSign}>
            <Send /> {t("post.action")}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-0">
          {reply ? (
            <Embed
              event={reply}
              group={group}
              className="border-b-none"
              relays={[group.relay]}
            />
          ) : null}
          <AutocompleteTextarea
            group={group}
            message={message}
            setMessage={setMessage}
            onCustomEmojisChange={setCustomEmoji}
            minRows={3}
            maxRows={6}
            placeholder={t("post.placeholder")}
            onFinish={post}
            //className={reply ? "border-t-none" : undefined}
          />
        </div>
        <div className="flex flex-row justify-end items-center w-full">
          <div className="flex flex-row gap-1 items-center">
            <UploadFile onUpload={onFileUpload} />
            <Button
              size="sm"
              disabled={message.trim().length === 0 || isPosting}
              onClick={post}
            >
              <Send /> {action}
            </Button>
          </div>
        </div>
        {/*
        <DialogFooter>
          <div className="flex flex-col gap-3 w-full">
            <h4 className="text-xs">Preview</h4>
            <Embed
              event={{
                kind,
                content: message.trim(),
                pubkey: me!,
                created_at: Date.now(),
		id: "",
		tags: customEmoji.map(e => ["emoji", e.name, e.image]),
		sig: "",
              }}
	      group={group}
            />
          </div>
        </DialogFooter>
	*/}
      </DialogContent>
    </Dialog>
  );
}

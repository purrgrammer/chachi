import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { UploadFile } from "@/components/upload-file";
import { AutocompleteTextarea } from "@/components/autocomplete-textarea";
import type { Group, Emoji } from "@/lib/types";

export function ReplyDialog({
  group,
  open,
  onOpenChange,
  onReply,
  children,
}: {
  group?: Group;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReply: (msg: string, tags: string[][]) => void;
  children?: React.ReactNode;
}) {
  const [isReplying, setIsReplying] = useState(false);
  const [message, setMessage] = useState("");
  const [customEmoji, setCustomEmoji] = useState<Emoji[]>([]);

  async function sendReply() {
    try {
      await onReply(
        message.trim(),
        customEmoji.map((e) => ["emoji", e.name, e.image] as string[]),
      );
    } catch (err) {
      console.error(err);
    } finally {
      setIsReplying(false);
    }
  }
  // todo: scroll?
  // fixme: dialog background element not respecting width
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex items-center justify-center border-none">
        <div className="bg-background p-2 rounded-sm min-w-[320px] sm:max-w-[425px]">
          {children}
          <div className="space-y-2">
            <AutocompleteTextarea
              autoFocus
              group={group}
              message={message}
              setMessage={setMessage}
              onFinish={sendReply}
              onCustomEmojisChange={setCustomEmoji}
              placeholder="What's on your mind?"
              minRows={3}
              maxRows={6}
            />
            <div className="flex flex-row items-center justify-end w-full">
              <div className="flex flex-row items-center gap-1">
                <UploadFile
                  onUpload={(url) => setMessage(`${message} ${url}`)}
                />
                <Button
                  size="sm"
                  disabled={message.trim().length === 0 || isReplying}
                  onClick={sendReply}
                >
                  Reply
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from "react";
import { RotateCw, Plus, Vote, BadgeX } from "lucide-react";
import { toast } from "sonner";
import { NostrEvent } from "nostr-tools";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { UploadFile } from "@/components/upload-file";
import { RichText } from "@/components/rich-text";
import { AutocompleteTextarea } from "@/components/autocomplete-textarea";
import { DatePicker } from "@/components/date-picker";
import { NDKEvent } from "@nostr-dev-kit/ndk";
import { useNDK } from "@/lib/ndk";
import { useRelaySet } from "@/lib/nostr";
import { useCanSign } from "@/lib/account";
import { randomId } from "@/lib/id";
import { POLL } from "@/lib/kinds";
import { dedupeBy } from "@/lib/utils";
import type { Group, Emoji } from "@/lib/types";

export function NewPoll({
  group,
  children,
  onSuccess,
}: {
  group: Group;
  children?: React.ReactNode;
  onSuccess?: () => void;
}) {
  const [endsAt, setEndsAt] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [newOption, setNewOption] = useState("");
  const [newOptionCustomEmoji, setNewOptionCustomEmoji] = useState<Emoji[]>([]);
  const [isPosting, setIsPosting] = useState(false);
  const [message, setMessage] = useState("");
  const [options, setOptions] = useState<string[][]>([]);
  const [customEmoji, setCustomEmoji] = useState<Emoji[]>([]);
  const ndk = useNDK();
  const relaySet = useRelaySet([group.relay]);
  const canSign = useCanSign();
  const endsAtIsValid = endsAt ? Number(endsAt) > Date.now() / 1000 : true;

  async function createPoll() {
    try {
      setIsPosting(true);
      if (message.trim()) {
        const ev = new NDKEvent(ndk, {
          kind: POLL,
          content: message.trim(),
          tags: [["h", group.id, group.relay], ...options],
        } as NostrEvent);
        if (endsAt) {
          ev.tags.push(["endsAt", endsAt]);
        }
        for (const e of dedupeBy(customEmoji, "name")) {
          ev.tags.push(["emoji", e.name, e.image!]);
        }
        await ev.sign();
        console.log("NEWPOLL", relaySet, ev.rawEvent());
        //await ev.publish(relaySet);
        return;
        setShowDialog(false);
        setMessage("");
        setOptions([]);
        setCustomEmoji([]);
        setEndsAt("");
        toast.success("Poll created");
        onSuccess?.();
      }
    } catch (err) {
      console.error(err);
      toast.error("Couldn't post");
    } finally {
      setIsPosting(false);
    }
  }

  function addOption() {
    const id = randomId();
    setOptions([...options, ["option", id, newOption]]);
    setCustomEmoji([...customEmoji, ...newOptionCustomEmoji]);
    setNewOption("");
    setNewOptionCustomEmoji([]);
  }

  function removeOption(id: string) {
    setOptions(options.filter((option) => option[1] !== id));
  }

  function onOpenChange(open: boolean) {
    setShowDialog(open);
    if (!open) {
      setMessage("");
      setOptions([]);
      setCustomEmoji([]);
      setNewOption("");
      setNewOptionCustomEmoji([]);
      setEndsAt("");
    }
  }

  function onDateSelect(d: Date | undefined) {
    if (d) {
      setEndsAt((d.getTime() / 1000).toFixed(0));
    }
  }

  return (
    <Dialog open={showDialog} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        {children || (
          <Button disabled={!canSign}>
            <Vote /> Post
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>New poll</DialogTitle>
        </DialogHeader>
        <div className="space-y-1">
          <div className="space-y-1">
            <Label>Question</Label>
            <AutocompleteTextarea
              group={group}
              message={message}
              setMessage={setMessage}
              onCustomEmojisChange={setCustomEmoji}
              minRows={2}
              maxRows={4}
              submitOnEnter={false}
            />
          </div>
          <div className="space-y-1">
            <Label>Expiration</Label>
            <div className="p-2">
              <DatePicker
                className={`rounded-lg ${endsAtIsValid ? "" : "text-destructive"}`}
                onSelect={onDateSelect}
              />
              {!endsAtIsValid && (
                <span className="text-xs text-destructive">
                  Expiry date must be in the future
                </span>
              )}
            </div>
          </div>
          <div className="space-y-1">
            <Label>Options</Label>
            <div className="flex flex-row items-center gap-1">
              <AutocompleteTextarea
                group={group}
                message={newOption}
                setMessage={setNewOption}
                onCustomEmojisChange={setNewOptionCustomEmoji}
                minRows={1}
                maxRows={3}
                onFinish={addOption}
                submitOnEnter
                //className={reply ? "border-t-none" : undefined}
              />
              <UploadFile
                onUpload={(url) =>
                  setNewOption(newOption ? `${newOption} ${url}` : url)
                }
              />
              <Button disabled={!newOption} size="icon" onClick={addOption}>
                <Plus />
              </Button>
            </div>
          </div>
        </div>
        <div className="w-full flex flex-col gap-1">
          {options.map((option) => (
            <div
              key={option[1]}
              className="w-full flex flex-row items-center justify-between border p-2 rounded-sm relative"
            >
              <RichText
                group={group}
                tags={
                  customEmoji.map((e) => [
                    "emoji",
                    e.name,
                    e.image,
                  ]) as string[][]
                }
                options={{ inline: true }}
              >
                {option[2]}
              </RichText>
              <Button
                variant="destructive"
                size="smallIcon"
                className="absolute -top-2 -right-2"
                onClick={() => removeOption(option[1])}
              >
                <BadgeX />
              </Button>
            </div>
          ))}
        </div>
        <div className="flex flex-row items-center justify-end w-full">
          <Button
            size="sm"
            disabled={
              message.trim().length === 0 ||
              options.length === 0 ||
              !endsAtIsValid ||
              isPosting
            }
            onClick={createPoll}
          >
            {isPosting ? <RotateCw className="animate-spin" /> : <Vote />}{" "}
            Create poll
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from "react";
import { RotateCw, Plus, Vote, BadgeX } from "lucide-react";
import { toast } from "sonner";
import { NostrEvent } from "nostr-tools";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { useCanSign } from "@/lib/account";
import { randomId } from "@/lib/id";
import { POLL } from "@/lib/kinds";
import { dedupeBy } from "@/lib/utils";
import type { Group, Emoji } from "@/lib/types";
import { useTranslation } from "react-i18next";
import { usePublishEvent } from "@/lib/nostr/publishing";

export function NewPoll({
  group,
  children,
  onSuccess,
}: {
  group: Group;
  children?: React.ReactNode;
  onSuccess?: (ev: NostrEvent) => void;
}) {
  const [isMultiChoice, setIsMultiChoice] = useState(false);
  const [endsAt, setEndsAt] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [newOption, setNewOption] = useState("");
  const [newOptionCustomEmoji, setNewOptionCustomEmoji] = useState<Emoji[]>([]);
  const [isPosting, setIsPosting] = useState(false);
  const [message, setMessage] = useState("");
  const [options, setOptions] = useState<string[][]>([]);
  const [customEmoji, setCustomEmoji] = useState<Emoji[]>([]);
  const publish = usePublishEvent();
  const canSign = useCanSign();
  const endsAtIsValid = endsAt ? Number(endsAt) > Date.now() / 1000 : true;
  const { t } = useTranslation();

  async function createPoll() {
    try {
      setIsPosting(true);
      if (message.trim()) {
        const tags = [
          ["h", group.id, group.relay],
          ...(group.id === "_" ? [["-"]] : []),
          ["relay", group.relay],
          ...options,
          ["polltype", isMultiChoice ? "multiplechoice" : "singlechoice"],
        ];

        if (endsAt) {
          tags.push(["endsAt", endsAt]);
        }

        for (const e of dedupeBy(customEmoji, "name")) {
          tags.push(["emoji", e.name, e.image!]);
        }

        const template = {
          kind: POLL,
          content: message.trim(),
          tags,
          created_at: Math.floor(Date.now() / 1000),
        };

        const publishedEvent = await publish(template, [group.relay]);

        setShowDialog(false);
        setIsMultiChoice(false);
        setMessage("");
        setOptions([]);
        setCustomEmoji([]);
        setEndsAt("");
        toast.success(t("poll.create.success"));
        onSuccess?.(publishedEvent);
      }
    } catch (err) {
      console.error(err);
      toast.error(t("poll.create.error"));
    } finally {
      setIsPosting(false);
    }
  }

  function addOption() {
    const id = randomId();
    setOptions([...options, ["option", id, newOption.trim()]]);
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
            <Vote /> {t("post.action")}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t("poll.new")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-1">
          <div className="space-y-1">
            <Label>{t("poll.question")}</Label>
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
            <Label>{t("poll.expiration.label")}</Label>
            <div className="p-2">
              <DatePicker
                className={`rounded-lg ${endsAtIsValid ? "" : "text-destructive"}`}
                onSelect={onDateSelect}
              />
              {!endsAtIsValid && (
                <span className="text-xs text-destructive">
                  {t("poll.expiration.check")}
                </span>
              )}
            </div>
          </div>
          <div className="space-y-1">
            <Label>{t("poll.options")}</Label>
            <div className="flex flex-row gap-1 items-center">
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
                // todo: add imeta tags
                onUpload={(blob) =>
                  setNewOption(
                    newOption ? `${newOption} ${blob.url}` : blob.url,
                  )
                }
              />
              <Button disabled={!newOption} size="icon" onClick={addOption}>
                <Plus />
              </Button>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-1 w-full">
          {options.map((option) => (
            <div
              key={option[1]}
              className="flex relative flex-row justify-between items-center p-2 w-full rounded-sm border"
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
          <div className="flex gap-2 items-center px-2">
            <Switch id="multiple-choice" onCheckedChange={setIsMultiChoice} />
            <Label htmlFor="multiple-choice">
              {t("poll.multiple-choices")}
            </Label>
          </div>
        </div>
        <div className="flex flex-row justify-end items-center w-full">
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
            {t("poll.create.action")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

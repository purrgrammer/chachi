import { useState } from "react";
import { toast } from "sonner";
import { NostrEvent } from "nostr-tools";
import { SmilePlus, RotateCw, Star, Check } from "lucide-react";
import * as Kind from "@/lib/nostr/kinds";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { useCustomEmojis } from "@/lib/nostr/emojis";
import { useRelays } from "@/lib/nostr";
import { useTranslation } from "react-i18next";
import { usePublishEvent } from "@/lib/nostr/publishing";

export default function EmojiSet({ event }: { event: NostrEvent }) {
  const { data: myEmojis } = useCustomEmojis();
  const relays = useRelays();
  const title = event.tags.find((t) => t[0] === "title")?.[1];
  const identifier = event.tags.find((t) => t[0] === "d")?.[1];
  const emojis = event.tags.filter((t) => t[0] === "emoji");
  const inCollection = myEmojis.some(
    (e) => e.identifier === identifier && e.pubkey === event.pubkey,
  );
  const [isSaving, setIsSaving] = useState(false);
  const { t } = useTranslation();
  const publish = usePublishEvent();
  async function toggleFavorite() {
    try {
      setIsSaving(true);
      let newTags = [];
      if (inCollection) {
        newTags = myEmojis
          .filter((s) => s.pubkey !== event.pubkey || s.name !== title)
          .map((e) => ["a", `${Kind.EmojiSet}:${e.pubkey}:${e.name}`]);
      } else {
        const myEmojiTags = myEmojis.map((e) => [
          "a",
          `${Kind.EmojiSet}:${e.pubkey}:${e.name}`,
        ]);
        newTags = [
          ...myEmojiTags,
          ["a", `${Kind.EmojiSet}:${event.pubkey}:${identifier}`],
        ];
      }
      const template = {
        kind: Kind.EmojiList,
        content: "",
        tags: newTags,
        created_at: Math.floor(Date.now() / 1000),
      };
      await publish(template, relays);
    } catch (err) {
      console.error(err);
      toast.error(t("emoji.set.bookmark.error"));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="flex flex-row gap-1 justify-between items-center w-full">
        <div className="flex flex-row gap-2 items-center justify-between w-full">
          <h4 className="text-xl font-semibold">{title || identifier}</h4>
          <div className="flex flex-row items-center gap-2">
            <div className="flex flex-row items-center gap-1 text-muted-foreground">
              <SmilePlus className="size-4" />
              <span className="text-xs font-mono">{emojis.length}</span>
            </div>
            <Button
              disabled={isSaving}
              variant={inCollection ? "default" : "ghost"}
              size="smallIcon"
              onClick={toggleFavorite}
            >
              {isSaving ? (
                <RotateCw className="animate-spin" />
              ) : inCollection ? (
                <Check />
              ) : (
                <Star />
              )}
            </Button>
          </div>
        </div>
      </div>
      <div className="">
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {emojis.map((emoji) => (
            <Tooltip key={emoji[1]}>
              <TooltipTrigger asChild>
                <div className="flex justify-center items-center">
                  <img
                    className="w-24 h-24"
                    src={emoji[2]}
                    alt={emoji[1]}
                    key={emoji[1]}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>{emoji[1]}</TooltipContent>
            </Tooltip>
          ))}
        </div>
      </div>
    </div>
  );
}

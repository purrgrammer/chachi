import { useState } from "react";
import { toast } from "sonner";
import { NostrEvent } from "nostr-tools";
import { NDKEvent, NDKKind } from "@nostr-dev-kit/ndk";
import { RotateCw, Star, Check } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { useNDK } from "@/lib/ndk";
import { useCustomEmojis } from "@/lib/nostr/emojis";
import { useRelays, useRelaySet } from "@/lib/nostr";

export function EmojiSet({ event }: { event: NostrEvent }) {
  const { data: myEmojis } = useCustomEmojis();
  const relays = useRelays();
  const relaySet = useRelaySet(relays);
  const ndk = useNDK();
  const title = event.tags.find((t) => t[0] === "title")?.[1];
  const identifier = event.tags.find((t) => t[0] === "d")?.[1];
  const emojis = event.tags.filter((t) => t[0] === "emoji");
  const inCollection = myEmojis.some(
    (e) => e.identifier === identifier && e.pubkey === event.pubkey,
  );
  const [isSaving, setIsSaving] = useState(false);
  async function toggleFavorite() {
    try {
      setIsSaving(true);
      let newTags = [];
      if (inCollection) {
        newTags = myEmojis
          .filter((s) => s.pubkey !== event.pubkey || s.name !== title)
          .map((e) => ["a", `${NDKKind.EmojiSet}:${e.pubkey}:${e.name}`]);
      } else {
        const myEmojiTags = myEmojis.map((e) => [
          "a",
          `${NDKKind.EmojiSet}:${e.pubkey}:${e.name}`,
        ]);
        newTags = [
          ...myEmojiTags,
          ["a", `${NDKKind.EmojiSet}:${event.pubkey}:${identifier}`],
        ];
      }
      const ev = new NDKEvent(ndk, {
        kind: NDKKind.EmojiList,
        content: "",
        tags: newTags,
      } as NostrEvent);
      await ev.publish(relaySet);
    } catch (err) {
      console.error(err);
      toast.error("Failed to bookmark emoji set");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-row gap-1 items-center justify-between">
        <h4 className="text-xl font-semibold">{title || identifier}</h4>
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
      <div className="">
        <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
          {emojis.map((emoji) => (
            <Tooltip key={emoji[1]}>
              <TooltipTrigger asChild>
                <div className="flex items-center justify-center">
                  <img
                    className="size-8"
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

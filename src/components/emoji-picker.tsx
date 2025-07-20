import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import { useTheme } from "@/components/theme-provider";
import { useCustomEmojis } from "@/lib/nostr/emojis";
import { Dialog, DialogContent } from "@/components/ui/dialog";

export interface Emoji {
  id: string;
  name: string;
  native?: string;
  src?: string;
  shortcodes?: string;
  address?: string;
}

export function EmojiPicker({
  open,
  onOpenChange,
  onEmojiSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEmojiSelect: (e: Emoji) => void;
}) {
  const { theme } = useTheme();
  const { data: custom } = useCustomEmojis();

  const customEmoji =
    custom?.map(({ name, address, emojis }) => {
      const customEmojis = emojis.map(({ name, image }) => ({
        id: name,
        name,
        skins: [{ src: image }],
      }));
      return { id: name, name, address, emojis: customEmojis };
    }) ?? [];

  const emojiNameToAddress = customEmoji.reduce(
    (acc, { address, emojis }) => {
      emojis.forEach(({ name }) => {
        acc[name] = address;
      });
      return acc;
    },
    {} as Record<string, string | undefined>,
  );

  function onSelect(e: Emoji) {
    const address = emojiNameToAddress[e.name];
    if (address) {
      onEmojiSelect({ ...e, address });
    } else {
      onEmojiSelect(e);
    }
    onOpenChange(false);
  }

  // todo: scroll?
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="outline-none border-none">
        <div className="flex justify-center items-center">
          <div className="emoji-picker w-[352px]">
            <Picker
              dynamicWidth={false}
              data={data}
              theme={theme === "system" ? "auto" : theme}
              custom={customEmoji}
              onEmojiSelect={onSelect}
              maxFrequentRows={1}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

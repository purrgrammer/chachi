import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import { useTheme } from "@/components/theme-provider";
import { useCustomEmojis } from "@/lib/nostr/emojis";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogContent,
} from "@/components/ui/dialog";
import { useTranslation } from "react-i18next";

export interface Emoji {
  id: string;
  name: string;
  native?: string;
  src?: string;
  shortcodes?: string;
}

export function EmojiPicker({
  open,
  onOpenChange,
  onEmojiSelect,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEmojiSelect: (e: Emoji) => void;
  children?: React.ReactNode;
}) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { data: custom } = useCustomEmojis();
  const customEmoji =
    custom?.map(({ name, emojis }) => {
      const customEmojis = emojis.map(({ name, image }) => ({
        id: name,
        name,
        skins: [{ src: image }],
      }));
      return { id: name, name, emojis: customEmojis };
    }) ?? [];

  function onSelect(e: Emoji) {
    onEmojiSelect(e);
  }

  // todo: scroll?
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("emoji.pick")}</DialogTitle>
        </DialogHeader>
        <div className="flex justify-center items-center border-none bg-background">
          <div className="emoji-picker w-[352px]">
            {children}
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

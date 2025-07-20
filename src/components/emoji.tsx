import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useEmojiSet } from "@/lib/nostr/emojis";
import EmojiSet from "@/components/nostr/emoji-set";
import { NostrEvent } from "nostr-tools";

export function Emoji({
  name,
  image,
  className,
  address,
}: {
  name: string;
  image: string;
  className?: string;
  address?: string;
}) {
  const { t } = useTranslation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const emojiSet = useEmojiSet(address);

  const handleClick = () => {
    if (address && emojiSet) {
      setIsDialogOpen(true);
    }
  };

  const isClickable = address && emojiSet;

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <img
            src={image}
            className={cn(
              "size-5 inline-block",
              isClickable &&
                "cursor-pointer hover:opacity-80 transition-opacity",
              className,
            )}
            alt={name}
            onClick={handleClick}
          />
        </TooltipTrigger>
        <TooltipContent>
          {name}
          {isClickable && (
            <div className="text-xs text-muted-foreground">
              {t("emoji.set.dialog.click-to-view")}
            </div>
          )}
        </TooltipContent>
      </Tooltip>

      {emojiSet && (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t("emoji.set.dialog.title")}</DialogTitle>
            </DialogHeader>
            <EmojiSet
              event={
                {
                  id: emojiSet.address,
                  kind: 30030,
                  created_at: emojiSet.created_at,
                  content: "",
                  pubkey: emojiSet.pubkey,
                  sig: "",
                  tags: [
                    ["d", emojiSet.identifier || ""],
                    ["title", emojiSet.name || ""],
                    ...emojiSet.emojis.map((emoji) => [
                      "emoji",
                      emoji.name,
                      emoji.image,
                    ]),
                  ],
                } as NostrEvent
              }
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

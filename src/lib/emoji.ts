import emojiData from "@emoji-mart/data";
import type { Emoji } from "@/lib/types";

export const CUSTOM_EMOJI_CONTENT_REGEX = /^:[\S]+:$/;
export const CUSTOM_EMOJI_REGEX = /(:[\S]+:)/g;

interface Skin {
  native: string;
}

interface EmojiData {
  skins: Skin[];
  keywords?: string[];
}

export const emojis: Emoji[] = Object.entries(
  // @ts-expect-error: reeeee
  emojiData.emojis as Record<string, EmojiData>,
).map(
  ([name, emoji]: [string, EmojiData]) =>
    ({
      name,
      native: emoji.skins[0]?.native,
      //todo: add keywords when we use them
      //keywords: emoji.keywords,
    }) as Emoji,
);

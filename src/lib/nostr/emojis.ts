import { useAtomValue } from "jotai";
import NDK, { NDKRelaySet } from "@nostr-dev-kit/ndk";
import { emojiSetsAtom } from "@/app/store";
import type { CustomEmoji, EmojiSet } from "@/lib/types";

export async function fetchCustomEmojis(
  ndk: NDK,
  emojiSetRefs: string[],
  relaySet: NDKRelaySet,
): Promise<EmojiSet[]> {
  const filters = emojiSetRefs.map((t) => {
    const [kind, author, identifier] = t.split(":");
    return { kinds: [Number(kind)], authors: [author], "#d": [identifier] };
  });
  if (filters.length === 0) return [];
  const sets = await ndk.fetchEvents(
    filters,
    {
      closeOnEose: true,
      groupable: false,
    },
    relaySet,
  );
  return Array.from(sets).map((set) => {
    const identifier = set.tags.find((t) => t[0] === "d")?.[1];
    const title = set.tags.find((t) => t[0] === "title")?.[1];
    const emojis = set.tags
      .filter((t) => t[0] === "emoji")
      .map(
        (t) =>
          ({ name: t[1], image: t[2], shortcodes: `:${t[1]}:` }) as CustomEmoji,
      );
    return {
      name: title || identifier,
      identifier,
      pubkey: set.pubkey,
      emojis,
    } as EmojiSet;
  });
}

export function useCustomEmojis() {
  const emojiSets = useAtomValue(emojiSetsAtom);
  return { data: emojiSets };
}

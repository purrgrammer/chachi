import { useEffect, useMemo } from "react";
import { useAtom, useAtomValue } from "jotai";
import { useLiveQuery } from "dexie-react-hooks";
import NDK, {
  NDKSubscription,
  NDKEvent,
  NDKKind,
  NDKRelaySet,
  NDKSubscriptionCacheUsage,
} from "@nostr-dev-kit/ndk";
import { emojiListAtom } from "@/app/store";
import { useNDK } from "@/lib/ndk";
import { useRelays, useRelaySet } from "@/lib/nostr";
import type { CustomEmoji, EmojiSet } from "@/lib/types";
import { usePubkey } from "@/lib/account";
import db, { saveEmojiSet } from "@/lib/db";

// Helper to parse and validate emoji set addresses
function parseEmojiAddress(
  address: string,
): { kind: number; author: string; identifier: string } | null {
  const parts = address.split(":");
  if (parts.length !== 3) return null;

  const [kindStr, author, identifier] = parts;
  const kind = Number(kindStr);

  if (!kindStr || !author || !identifier || isNaN(kind)) return null;

  return { kind, author, identifier };
}

// Rate limiting for subscriptions to prevent overwhelming relays
const MAX_CONCURRENT_SUBSCRIPTIONS = 10;

function toEmojiSet(set: NDKEvent): EmojiSet | null {
  try {
    const address = set.tagId();
    if (!address) {
      console.warn("NDKEvent missing tagId, skipping emoji set conversion");
      return null;
    }

    const identifier = set.tags.find((t) => t[0] === "d")?.[1];
    const title = set.tags.find((t) => t[0] === "title")?.[1];

    if (!identifier) {
      console.warn("Emoji set missing identifier (d tag)");
      return null;
    }

    const emojis = set.tags
      .filter((t) => t[0] === "emoji" && t[1] && t[2]) // Validate emoji tags have name and image
      .map(
        (t): CustomEmoji => ({
          name: t[1],
          image: t[2],
          shortcodes: `:${t[1]}:`,
          address,
        }),
      );

    return {
      name: title || identifier,
      created_at: set.created_at || 0,
      identifier,
      pubkey: set.pubkey,
      address,
      emojis,
    };
  } catch (error) {
    console.error("Failed to convert NDKEvent to EmojiSet:", error);
    return null;
  }
}

export async function fetchCustomEmojis(
  ndk: NDK,
  emojiSetRefs: string[],
  relaySet: NDKRelaySet,
): Promise<EmojiSet[]> {
  const filters = emojiSetRefs
    .map(parseEmojiAddress)
    .filter((parsed): parsed is NonNullable<typeof parsed> => parsed !== null)
    .map(({ kind, author, identifier }) => ({
      kinds: [kind],
      authors: [author],
      "#d": [identifier],
    }));

  if (filters.length === 0) return [];
  console.log("fetchCustomEmojis", { filters });

  const sets = await ndk.fetchEvents(
    filters,
    {
      closeOnEose: true,
      cacheUsage: NDKSubscriptionCacheUsage.ONLY_RELAY,
    },
    relaySet,
  );

  return Array.from(sets)
    .map(toEmojiSet)
    .filter((emojiSet): emojiSet is EmojiSet => emojiSet !== null);
}

// todo: remove `data`
export function useCustomEmojis(): { data: EmojiSet[] } {
  const emojiList = useAtomValue(emojiListAtom);
  const emojiSets = useLiveQuery(
    () => db.emojiSets.where("address").anyOf(emojiList.emojis).toArray(),
    [emojiList],
    [],
  );
  return { data: emojiSets };
}

export function useEmojiSet(address: string | undefined): EmojiSet | null {
  const ndk = useNDK();
  const relays = useRelays();
  const relaySet = useRelaySet(relays);

  const emojiSet = useLiveQuery(
    async () => {
      if (!address) return null;

      // First, try to get from cache
      const cached = await db.emojiSets.get(address);
      if (cached) {
        return cached;
      }

      // If not in cache, fetch from relays
      if (ndk) {
        const parsed = parseEmojiAddress(address);
        if (parsed) {
          try {
            const filter = {
              kinds: [parsed.kind],
              authors: [parsed.author],
              "#d": [parsed.identifier],
            };

            const events = await ndk.fetchEvents(
              filter,
              {
                closeOnEose: true,
                cacheUsage: NDKSubscriptionCacheUsage.ONLY_RELAY,
              },
              relaySet,
            );

            if (events.size > 0) {
              const event = Array.from(events)[0];
              const emojiSet = toEmojiSet(event);
              if (emojiSet) {
                // Save to cache for future use
                await saveEmojiSet(emojiSet);
                return emojiSet;
              }
            }
          } catch (error) {
            console.error("Failed to fetch emoji set:", error);
          }
        }
      }

      return null;
    },
    [address, ndk, relaySet],
    null,
  );

  return emojiSet;
}

export function useSyncEmojiSets() {
  const ndk = useNDK();
  const [emojiList, setEmojiList] = useAtom(emojiListAtom);
  const pubkey = usePubkey();
  const relays = useRelays();
  const relaySet = useRelaySet(relays);

  // Keep the NIP-51 Emoji List up to date
  useEffect(() => {
    if (!pubkey) return;
    const sub = ndk.subscribe(
      {
        kinds: [NDKKind.EmojiList],
        authors: [pubkey],
        since: emojiList.created_at,
      },
      {
        cacheUsage: NDKSubscriptionCacheUsage.ONLY_RELAY,
        closeOnEose: false,
      },
      relaySet,
    );

    sub.on("event", async (event) => {
      if (event.created_at && event.created_at > (emojiList.created_at || 0)) {
        const emojiSetRefs =
          event.tags.filter((t) => t[0] === "a").map((t) => t[1]) ?? [];
        setEmojiList({
          created_at: event.created_at,
          emojis: emojiSetRefs,
        });
      }
    });

    return () => sub.stop();
  }, [pubkey]);

  // Memoize emoji addresses to prevent unnecessary re-subscriptions
  const emojiAddresses = useMemo(() => emojiList.emojis, [emojiList.emojis]);

  useEffect(() => {
    if (!ndk || emojiAddresses.length === 0) return;

    const subscriptions: NDKSubscription[] = [];

    const syncEmojiSets = async () => {
      // Rate limit subscriptions to prevent overwhelming relays
      const addressesToSync = emojiAddresses.slice(
        0,
        MAX_CONCURRENT_SUBSCRIPTIONS,
      );

      if (addressesToSync.length < emojiAddresses.length) {
        console.warn(
          `Rate limiting emoji sync: processing ${addressesToSync.length} of ${emojiAddresses.length} emoji sets`,
        );
      }

      // For each emoji set reference in the user's emoji list, create a subscription
      for (const address of addressesToSync) {
        const parsed = parseEmojiAddress(address);
        if (!parsed) {
          console.warn(`Invalid emoji address format: ${address}`);
          continue;
        }

        try {
          // Get locally stored emoji set to check last seen created_at
          const localEmojiSet = await db.emojiSets.get(address);
          const since = localEmojiSet?.created_at;

          const filter = {
            kinds: [parsed.kind],
            authors: [parsed.author],
            "#d": [parsed.identifier],
            ...(since ? { since: since + 1 } : {}),
          };

          const sub = ndk.subscribe(
            filter,
            {
              cacheUsage: NDKSubscriptionCacheUsage.ONLY_RELAY,
              closeOnEose: false,
            },
            relaySet,
          );

          sub.on("event", async (event) => {
            try {
              const newEmojiSet = toEmojiSet(event);
              if (!newEmojiSet) {
                console.warn(
                  `Failed to parse emoji set for address: ${address}`,
                );
                return;
              }

              const existingSet = await db.emojiSets.get(address);

              // Only save if this is a newer version
              if (
                !existingSet ||
                newEmojiSet.created_at > existingSet.created_at
              ) {
                await saveEmojiSet(newEmojiSet);
              }
            } catch (error) {
              console.error(
                `Failed to process emoji set event for ${address}:`,
                error,
              );
            }
          });

          subscriptions.push(sub);
        } catch (error) {
          console.error(
            `Failed to create subscription for emoji set ${address}:`,
            error,
          );
        }
      }
    };

    syncEmojiSets();

    return () => {
      subscriptions.forEach((sub) => sub.stop());
    };
  }, [emojiAddresses, ndk, relaySet]);
}

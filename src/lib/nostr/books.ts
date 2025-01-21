import { NDKFilter } from "@nostr-dev-kit/ndk";
import { NostrEvent } from "nostr-tools";
import { useRequest } from "@/lib/nostr";
import { dedupe } from "@/lib/utils";

export function useBook(event: NostrEvent) {
  const chapters = event.tags.filter((t) => t[0] === "a" || t[0] === "e");
  const eventIds = chapters.filter((t) => t[0] === "e").map((t) => t[1]);
  const addresses = chapters.filter((t) => t[0] === "a").map((t) => t[1]);
  const addressesFilter =
    addresses.length > 0
      ? addresses.reduce(
          (acc, a) => {
            const [kind, pubkey, identifier] = a.split(":");
            const kinds = acc["kinds"] || [];
            const authors = acc["authors"] || [];
            const dTags = acc["#d"] || [];
            return {
              kinds: dedupe([...kinds, Number(kind)]),
              authors: dedupe([...authors, pubkey]),
              "#d": dedupe([...dTags, identifier]),
            } as NDKFilter;
          },
          { kinds: [], authors: [], "#d": [] } as NDKFilter,
        )
      : null;
  const filters = [
    ...(eventIds.length > 0 ? [{ ids: eventIds } as NDKFilter] : []),
    ...(addressesFilter ? [addressesFilter] : []),
  ];
  // todo: relays, structure book
  return useRequest(filters, []);
}

import { useStream } from "@/lib/nostr";
import { NDKKind } from "@nostr-dev-kit/ndk";
import { validateZap } from "@/lib/nip-57";
import { validateNutzap } from "@/lib/nip-61";
import { useMemo } from "react";

export function useSupporters(
  pubkey: string,
  relays: string[],
  options: { waitForEose?: boolean } = {
    waitForEose: true,
  },
): [string, number][] {
  const { waitForEose } = options;
  const { events, eose } = useStream(
    {
      kinds: [NDKKind.Zap, NDKKind.Nutzap],
      "#p": [pubkey],
    },
    relays,
  );
  const zaps = events
    .map((event) => {
      return {
        event,
        zap:
          event.kind === NDKKind.Zap
            ? validateZap(event)
            : validateNutzap(event),
      };
    })
    .filter(({ zap }) => zap !== null);
  const supporters = useMemo(() => {
    const contributors = zaps.reduce(
      (acc, zap) => {
        if (zap.zap?.pubkey) {
          acc[zap.zap?.pubkey] = (acc[zap.zap?.pubkey] || 0) + zap.zap?.amount;
        }
        return acc;
      },
      {} as Record<string, number>,
    );
    const sortedContributors = Object.entries(contributors);
    sortedContributors.sort((a, b) => {
      const [, amountA] = a;
      const [, amountB] = b;
      return amountB - amountA;
    });
    return sortedContributors;
  }, [zaps]);
  if (waitForEose) {
    return eose ? supporters : [];
  }
  return supporters;
}

import { useTranslation } from "react-i18next";
import { useStream } from "@/lib/nostr";
import { NDKKind } from "@nostr-dev-kit/ndk";
import { validateZap } from "@/lib/nip-57";
import { validateNutzap } from "@/lib/nip-61";
import { User } from "@/components/nostr/user";
import { HandHeart } from "lucide-react";
import { Donate } from "@/components/donate";
import { OPENSATS_PUBKEY } from "@/constants";
import { useMemo } from "react";

export function useSupporters(
  pubkey: string,
  relays: string[],
): [string, number][] {
  const { events } = useStream(
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
  return supporters;
}

export default function Supporters({
  pubkey,
  relays,
}: {
  pubkey: string;
  relays: string[];
}) {
  const { t } = useTranslation();
  const supporters = useSupporters(pubkey, relays);
  return (
    <div className="flex flex-col items-center justify-center gap-8 py-12 px-8 w-full bg-accent/40">
      <div className="flex flex-col items-center gap-2">
        <div className="flex flex-row items-end gap-3 mb-2">
          <HandHeart className="size-10 text-muted-foreground" />
          <h2 className="text-5xl font-semibold leading-none">
            {t("landing.supporters")}
          </h2>
        </div>
        <p className="text-center text-balance text-lg text-muted-foreground">
          {t("landing.supporters-desc")}
        </p>
      </div>
      <div className="grid grid-cols-8 gap-4">
        <User
          key={OPENSATS_PUBKEY}
          pubkey={OPENSATS_PUBKEY}
          classNames={{ avatar: "size-12", name: "hidden" }}
        />
        {supporters.map(([pubkey]) => (
          <User
            key={pubkey}
            pubkey={pubkey}
            classNames={{ avatar: "size-12", name: "hidden" }}
          />
        ))}
      </div>
      <Donate />
    </div>
  );
}

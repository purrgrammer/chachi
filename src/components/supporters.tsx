import { useTranslation } from "react-i18next";
import { User } from "@/components/nostr/user";
import { HandHeart } from "lucide-react";
import { Donate } from "@/components/donate";
import { OPENSATS_PUBKEY } from "@/constants";
import { useSupporters } from "@/lib/nostr/zaps";

export default function Supporters({
  pubkey,
  relays,
}: {
  pubkey: string;
  relays: string[];
}) {
  const { t } = useTranslation();
  const supporters = useSupporters(pubkey, relays, {
    waitForEose: false,
  });
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

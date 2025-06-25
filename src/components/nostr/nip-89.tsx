import { useState } from "react";
import { Link } from "react-router-dom";
import { Code, Globe, Tags, Layers } from "lucide-react";
import { NostrEvent } from "nostr-tools";
import { useTranslation } from "react-i18next";
import { NDKKind } from "@nostr-dev-kit/ndk";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Avatar as NostrAvatar } from "@/components/nostr/avatar";
import { Badge } from "@/components/ui/badge";
import { ContentKinds } from "@/lib/constants/kinds";
import { Name } from "@/components/nostr/name";
import { Address } from "@/components/nostr/event";
import { useAppDefinition } from "@/lib/nip-89";

export function AppRecommendation({
  event,
  relays,
}: {
  event: NostrEvent;
  relays: string[];
}) {
  const { t } = useTranslation();
  const appRef = event.tags.find(
    (t) => t[0] === "a" && t[1]?.startsWith(`${NDKKind.AppHandler}:`),
  )?.[1];
  if (!appRef) {
    return null;
  }
  const recommendedKindStr = event.tags.find((t) => t[0] === "d" && t[1])?.[1];
  const recommendedKind = recommendedKindStr
    ? ContentKinds.find((k) => k.kind === Number(recommendedKindStr))
    : undefined;
  const [kind, pubkey, id] = appRef.split(":");

  return (
    <div className="flex flex-col gap-2">
      {recommendedKind ? (
        <Badge
          variant="secondary"
          className="text-xs flex items-center gap-1 w-fit"
        >
          {recommendedKind.icon}
          <span>{t(recommendedKind.translationKey)}</span>
        </Badge>
      ) : (
        <Badge
          variant="secondary"
          className="text-xs flex items-center gap-1 w-fit"
        >
          <Code className="size-3" />
          <span>
            {t("kinds.unknown", "Kind {{kind}}", { kind: recommendedKindStr })}
          </span>
        </Badge>
      )}
      <Address
        pubkey={pubkey}
        kind={Number(kind)}
        identifier={id}
        relays={relays || ["wss://relay.nostr.band"]}
      />
    </div>
  );
}

export function AppDefinition({ event }: { event: NostrEvent }) {
  const { t } = useTranslation();
  const [isBannerLoaded, setBannerLoaded] = useState(false);
  const profile = useAppDefinition(event);

  // Extract app details
  const appName =
    profile?.display_name ||
    profile?.name ||
    (event.pubkey ? <Name pubkey={event.pubkey} /> : "Unknown App");
  const supportedKinds = event.tags
    .filter((t) => t[0] === "k")
    .map((t) => Number(t[1]));
  const repositories = event.tags
    .filter((t) => t[0] === "r" && t[2] === "source")
    .map((t) => t[1]);
  const categories = event.tags.filter((t) => t[0] === "t").map((t) => t[1]);

  // Find kind info for all supported kinds
  const kindInfos = supportedKinds
    .map((kind) => ContentKinds.find((k) => k.kind === kind))
    .filter(Boolean);

  const banner = profile?.banner;

  return (
    <div className="flex items-center justify-center">
      <div className="flex flex-col relative w-full max-w-4xl">
        {banner && (
          <img
            src={banner}
            alt={`${appName} banner`}
            className="w-full min-h-42 max-h-96 aspect-image object-cover rounded-t-lg"
            onLoad={() => setBannerLoaded(true)}
          />
        )}
        <div
          className={`flex flex-col px-4 py-2 ${isBannerLoaded ? "-mt-20" : ""}`}
        >
          <div className="flex flex-col items-start gap-3">
            <div className="flex flex-col gap-1 items-start">
              {profile?.picture ? (
                <Avatar className="size-32 border-4 border-background">
                  <AvatarImage src={profile.picture} />
                  <AvatarFallback>
                    {typeof appName === "string"
                      ? appName.slice(0, 2).toUpperCase()
                      : "AP"}
                  </AvatarFallback>
                </Avatar>
              ) : event.pubkey ? (
                <NostrAvatar
                  pubkey={event.pubkey}
                  className="size-32 border-4 border-background"
                />
              ) : null}
              <div className="flex flex-col gap-0 mt-2">
                <h2 className="text-2xl font-bold">{appName}</h2>
                {profile?.about && (
                  <p className="text-balance text-muted-foreground line-clamp-1">
                    {profile.about}
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-col items-start gap-0.5 pb-2">
              {profile?.website && (
                <Link
                  to={profile.website}
                  className="font-mono text-xs px-2 hover:underline hover:decoration-dotted"
                  target="_blank"
                >
                  <div className="flex flex-row items-center gap-1">
                    <Globe className="size-3 text-muted-foreground" />
                    <span className="line-clamp-1 break-all">
                      {profile.website}
                    </span>
                  </div>
                </Link>
              )}

              {repositories.length > 0 && (
                <Link
                  to={repositories[0]}
                  className="font-mono text-xs px-2 hover:underline hover:decoration-dotted"
                  target="_blank"
                >
                  <div className="flex flex-row items-center gap-1">
                    <Code className="size-3 text-muted-foreground" />
                    <span className="line-clamp-1 break-all">
                      {repositories[0]}
                    </span>
                  </div>
                </Link>
              )}
            </div>
          </div>

          <div className="pt-2 flex flex-col gap-4">
            {categories.length > 0 && (
              <div className="flex flex-col gap-2">
                <div className="flex flex-row items-center gap-1">
                  <Tags className="size-4 text-muted-foreground" />
                  <h2 className="text-sm font-light uppercase text-muted-foreground">
                    {t("app.categories", "Categories")}
                  </h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  {categories.map((category) => (
                    <Badge key={category}>{category}</Badge>
                  ))}
                </div>
              </div>
            )}

            {kindInfos.length > 0 && (
              <div className="flex flex-col gap-2">
                <div className="flex flex-row items-center gap-1">
                  <Layers className="size-4 text-muted-foreground" />
                  <h2 className="text-sm font-light uppercase text-muted-foreground">
                    {t("app.supported_kinds", "Content Types")}
                  </h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  {kindInfos.map((kindInfo) => (
                    <Badge
                      key={kindInfo!.kind}
                      variant="secondary"
                      className="text-xs flex items-center gap-1"
                    >
                      {kindInfo!.icon}
                      <span>{t(kindInfo!.translationKey)}</span>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

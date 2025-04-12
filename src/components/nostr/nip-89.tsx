import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, Code, Globe, Tags, Layers } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Avatar as NostrAvatar } from "@/components/nostr/avatar";
import { Badge } from "@/components/ui/badge";
import { useARef } from "@/lib/nostr";
import { ContentKinds } from "@/lib/constants/kinds";
import { NostrEvent } from "nostr-tools";
import { useTranslation } from "react-i18next";
import { Name } from "./name";

export function AppCard({
  address,
  kinds,
}: {
  address: string;
  kinds: number[];
}) {
  const { t } = useTranslation();
  const { data: app } = useARef(["a", address]);
  const profile = useMemo(() => {
    if (!app) return {};
    try {
      return JSON.parse(app.content);
    } catch (error) {
      console.error(error);
      return {};
    }
  }, [app]);

  const supportedKinds = (
    app?.tags.filter((t) => t[0] === "k").map((t) => Number(t[1])) || []
  )
    .map((kind) => ContentKinds.find((k) => k.kind === kind))
    .filter(Boolean);

  return profile?.name ? (
    <div className="border rounded-md max-w-xl">
      {profile.banner ? (
        <img
          src={profile.banner}
          alt="Banner"
          className="w-full h-40 aspect-image object-fit rounded-t-md"
        />
      ) : app?.pubkey ? (
        <NostrAvatar
          pubkey={app.pubkey}
          className="rounded-none w-full h-40 aspect-image object-fit rounded-t-md"
        />
      ) : null}
      <div className="flex flex-col gap-4">
        <div className="flex flex-row items-center gap-3">
          {profile?.picture ? (
            <Avatar className="size-14">
              <AvatarImage src={profile.picture} />
              <AvatarFallback>{profile.name?.slice(0, 2)}</AvatarFallback>
            </Avatar>
          ) : null}
          <div className="flex flex-col gap-0">
            <h3 className="text-lg font-semibold">
              {profile.name ||
                (app?.pubkey ? <Name pubkey={app.pubkey} /> : "Unknown App")}
            </h3>
            {profile.about ? (
              <p className="text-sm text-muted-foreground line-clamp-1">
                {profile.about}
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          {profile.website ? (
            <Link
              to={profile.website}
              target="_blank"
              className="font-mono text-xs text-muted-foreground hover:underline hover:decoration-dotted"
            >
              <div className="flex flex-row items-center gap-1">
                <ExternalLink className="size-3" />
                {profile.website}
              </div>
            </Link>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2 mt-1">
          {supportedKinds.map((kindInfo) => (
            <div
              key={kindInfo!.kind}
              className={`flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 rounded-full ${
                kinds.includes(kindInfo!.kind) ? "" : "opacity-50"
              }`}
            >
              {kindInfo!.icon}
              <span>{t(kindInfo!.translationKey)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  ) : null;
}

export function AppDefinition({ event }: { event: NostrEvent }) {
  const { t } = useTranslation();
  const [isBannerLoaded, setBannerLoaded] = useState(false);
  const profile = useMemo(() => {
    try {
      return JSON.parse(event.content);
    } catch (error) {
      console.error("Failed to parse app definition content:", error);
      return {};
    }
  }, [event]);

  // Extract app details
  const appName =
    profile?.name ||
    profile?.display_name ||
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

  const banner = profile.banner;

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
          className={`flex flex-row justify-between ${isBannerLoaded ? "-mt-20" : ""}`}
        >
          <div className="flex flex-col items-start gap-3">
            <div className="flex flex-col gap-1 items-start">
              {profile.picture ? (
                <Avatar className="size-32 border-4 border-background">
                  <AvatarImage src={profile.picture} alt={appName} />
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
                {profile.about && (
                  <p className="text-balance text-muted-foreground line-clamp-1">
                    {profile.about}
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-col items-start gap-0.5 pb-2">
              {profile.website && (
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
  );
}

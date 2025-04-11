import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  ExternalLink,
  Code,
  GitPullRequest,
  Globe,
  Info,
  Tags,
  Layers,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Avatar as NostrAvatar } from "@/components/nostr/avatar";
import { Badge } from "@/components/ui/badge";
import { useARef } from "@/lib/nostr";
import { ContentKinds } from "@/lib/constants/kinds";
import { useRecommendedApps as useRecommendedAppsImpl } from "@/lib/nip-89";
import { NostrEvent } from "nostr-tools";
import { useTranslation } from "react-i18next";
import { Name } from "./name";

export { useRecommendedAppsImpl as useRecommendedApps };

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
      <div className="flex flex-col gap-4 p-4">
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
              <p className="text-sm text-muted-foreground line-clamp-2">
                {profile.about}
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex flex-col gap-2 px-2">
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
              className={`flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 rounded-full ${
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

  return (
    <div className="w-full mx-auto">
      {/* Header with banner and profile */}
      <div className="relative mb-4">
        {profile.banner && (
          <div className="absolute top-0 left-0 right-0 h-32 overflow-hidden rounded-t-lg">
            <img
              src={profile.banner}
              alt={`${appName} banner`}
              className="w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/90"></div>
          </div>
        )}
        <div
          className={`flex items-center gap-4 ${profile.banner ? "pt-16" : ""} relative z-10`}
        >
          {profile.picture && (
            <Avatar className="size-20 border-4 border-background">
              <AvatarImage src={profile.picture} alt={appName} />
              <AvatarFallback>
                {appName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          )}
          <div>
            <h2 className="text-2xl font-bold">{appName}</h2>
            {profile.nip05 && (
              <p className="text-sm text-muted-foreground">{profile.nip05}</p>
            )}
          </div>
        </div>
      </div>

      {/* Links section */}
      <div className="flex flex-col gap-0.5 mb-4">
        {profile.website && (
          <Link
            to={profile.website}
            className="font-mono text-xs px-2 hover:underline hover:decoration-dotted"
            target="_blank"
          >
            <div className="flex flex-row items-center gap-1">
              <Globe className="size-3 text-muted-foreground" />
              {profile.website}
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
              {repositories[0]}
            </div>
          </Link>
        )}

        {repositories.length > 0 && repositories[0].includes("github.com") && (
          <Link
            to={`${repositories[0]}/pulls`}
            className="font-mono text-xs px-2 hover:underline hover:decoration-dotted"
            target="_blank"
          >
            <div className="flex flex-row items-center gap-1">
              <GitPullRequest className="size-3 text-muted-foreground" />
              {t("app.contribute", "Contribute")}
            </div>
          </Link>
        )}
      </div>

      {/* Content sections with reduced spacing */}
      <div className="space-y-4">
        {profile.about && (
          <div className="flex flex-col gap-2">
            <div className="flex flex-row items-center gap-1">
              <Info className="size-4 text-muted-foreground" />
              <h2 className="text-sm font-light uppercase text-muted-foreground">
                {t("app.about", "About")}
              </h2>
            </div>
            <p className="text-muted-foreground">{profile.about}</p>
          </div>
        )}

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
                <Badge key={category} variant="secondary">
                  {category}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {kindInfos.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="flex flex-row items-center gap-1">
              <Layers className="size-4 text-muted-foreground" />
              <h2 className="text-sm font-light uppercase text-muted-foreground">
                {t("app.supported_kinds", "Supported Content Types")}
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
  );
}

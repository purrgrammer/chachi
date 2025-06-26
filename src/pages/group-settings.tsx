import { useParams, useNavigate } from "react-router-dom";
import { Settings } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Navigate } from "react-router-dom";
import { Header } from "@/components/header";
import { useGroup } from "@/lib/nostr/groups";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { GroupEditor } from "@/components/nostr/groups/group-settings-form";
import { Button } from "@/components/ui/button";
import { LoadingScreen } from "@/components/loading-screen";
import { RelayLink, RelayName } from "@/components/nostr/relay";
import type { Group } from "@/lib/types";

function GroupHeader({ group }: { group: Group }) {
  const { t } = useTranslation();
  const { data: metadata } = useGroup(group);
  const name = metadata?.name;
  const isRelayGroup = group.id === "_";

  return (
    <Header>
      <div className="flex flex-row justify-between items-center w-full">
        <div className="flex flex-row justify-between items-center w-full">
          <div className="flex flex-row gap-2 items-center">
            {metadata?.picture ? (
              <img
                src={metadata.picture}
                className="size-6 sm:size-8 rounded-full"
              />
            ) : null}
            <div className="flex flex-col gap-0">
              <h2 className="text-lg line-clamp-1 leading-none">
                {isRelayGroup ? (
                  <RelayName relay={group.relay} />
                ) : (
                  <>{name || group.id.slice(0, 6)}</>
                )}
              </h2>
              <RelayLink
                relay={group.relay}
                classNames={{
                  icon: "size-3",
                  wrapper: "gap-1",
                  name: "text-xs text-muted-foreground line-clamp-1",
                }}
              />
            </div>
          </div>
          <div className="flex flex-row gap-2 items-center">
            <Tooltip>
              <TooltipTrigger>
                <Settings className="size-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                {t("group.settings.title", "Group Settings")}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </Header>
  );
}

export default function GroupSettings() {
  const { host, id } = useParams<{ host: string; id?: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Redirect to home if no host
  if (!host) {
    return <Navigate to="/" />;
  }

  // Create group object directly like in group.tsx
  const group: Group = {
    id: id || "_",
    relay: `wss://${host}`,
  };

  const { data: metadata, isLoading, error } = useGroup(group);

  // Show loading while fetching metadata
  if (isLoading) {
    return <LoadingScreen />;
  }

  // If error or no metadata found, show error page
  if (error || !metadata) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">
            {t("group.not-found", "Group Not Found")}
          </h1>
          <p className="text-muted-foreground mb-4">
            {error?.message ||
              t("group.error.no-metadata", "Could not load group information")}
          </p>
          <Button onClick={() => navigate(-1)}>
            {t("group.action.go-back", "Go Back")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <GroupHeader group={group} />
      <div className="p-2 sm:pl-12 max-w-xl">
        <GroupEditor group={group} metadata={metadata} />
      </div>
    </div>
  );
}

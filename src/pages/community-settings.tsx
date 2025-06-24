import { useParams, useNavigate } from "react-router-dom";
import { Castle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Header } from "@/components/header";
import { User } from "@/components/nostr/user";
import { useCommunity } from "@/lib/nostr/groups";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CommunityEditor } from "@/components/nostr/groups/community-edit";
import { usePubkey } from "@/lib/account";
import { Button } from "@/components/ui/button";
import { LoadingScreen } from "@/components/loading-screen";
import { parseProfileIdentifier, resolveNip05 } from "@/lib/profile-identifier";

interface CommunityValidatorProps {
  identifier: string;
  onValidated: (pubkey: string, relays: string[]) => void;
  onError: (error: string) => void;
}

function CommunityValidator({
  identifier,
  onValidated,
  onError,
}: CommunityValidatorProps) {
  const { t } = useTranslation();

  useEffect(() => {
    async function parseIdentifier() {
      if (!identifier) {
        onError(t("community.error.no-identifier", "No identifier provided"));
        return;
      }

      const parsed = parseProfileIdentifier(identifier);
      if (!parsed) {
        onError(
          t("community.error.invalid-format", "Invalid identifier format"),
        );
        return;
      }

      if (parsed.type === "nip05") {
        const resolvedPubkey = await resolveNip05(parsed.pubkey);
        if (!resolvedPubkey) {
          onError(
            t(
              "community.error.nip05-resolve",
              "Could not resolve NIP-05 address",
            ),
          );
          return;
        }
        onValidated(resolvedPubkey, []);
      } else {
        onValidated(parsed.pubkey, parsed.relays);
      }
    }

    parseIdentifier();
  }, [identifier, onValidated, onError, t]);

  return <LoadingScreen />;
}

function CommunityHeader({ pubkey }: { pubkey: string }) {
  const { t } = useTranslation();
  return (
    <Header>
      <div className="flex items-center w-full justify-between">
        <User
          pubkey={pubkey}
          classNames={{
            avatar: "size-8 rounded-full",
            name: "text-lg font-normal line-clamp-1",
          }}
          clickAction="link"
          linkRoot="/c"
        />
        <div className="flex flex-row items-center gap-2">
          <Tooltip>
            <TooltipTrigger>
              <Castle className="size-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent>{t("group.metadata.community")}</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </Header>
  );
}

function CommunitySettingsContent({ pubkey }: { pubkey: string }) {
  const community = useCommunity(pubkey);
  const userPubkey = usePubkey();
  const isOwner = userPubkey === pubkey;
  if (!isOwner) {
    return <Navigate to={`/c/${pubkey}`} replace />;
  }

  return (
    <div>
      <CommunityHeader pubkey={pubkey} />
      {community && isOwner ? (
        <div className="p-2 sm:pl-12">
          <CommunityEditor pubkey={pubkey} community={community} />
        </div>
      ) : null}
    </div>
  );
}

export default function CommunitySettings() {
  const { identifier } = useParams<{ identifier: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [pubkey, setPubkey] = useState<string | null>(null);
  const [, setRelays] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Reset state when identifier changes
  useEffect(() => {
    setPubkey(null);
    setRelays([]);
    setError(null);
  }, [identifier]);

  const handleValidated = (
    validatedPubkey: string,
    validatedRelays: string[],
  ) => {
    setPubkey(validatedPubkey);
    setRelays(validatedRelays);
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
  };

  // Redirect to home if no identifier
  if (!identifier) {
    return <Navigate to="/" />;
  }

  // Show error for identifier parsing errors
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">
            {t("community.not-found", "Community Not Found")}
          </h1>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => navigate(-1)}>
            {t("community.action.go-back", "Go Back")}
          </Button>
        </div>
      </div>
    );
  }

  // Show loading screen during identifier validation
  if (!pubkey && !error) {
    return (
      <CommunityValidator
        identifier={identifier}
        onValidated={handleValidated}
        onError={handleError}
      />
    );
  }

  // Render community settings content once we have a valid pubkey
  if (pubkey) {
    return <CommunitySettingsContent key={pubkey} pubkey={pubkey} />;
  }

  return null;
}

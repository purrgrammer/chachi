import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Shield, ShieldCheck, ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { authManager } from "@/lib/ndk";
import type { PendingAuthChallenge } from "@/lib/relay-auth-manager";
import { useFavicon } from "@/lib/hooks";

function RelayFavicon({ url }: { url: string }) {
  const faviconUrl = useFavicon(url);
  if (!faviconUrl) return <Shield className="size-4 text-muted-foreground" />;
  return (
    <img
      src={faviconUrl}
      alt=""
      className="size-4 rounded-sm"
      onError={(e) => {
        (e.target as HTMLImageElement).style.display = "none";
      }}
    />
  );
}

function getRelayDisplayName(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

function AuthToastContent({
  challenge,
  toastId,
}: {
  challenge: PendingAuthChallenge;
  toastId: string | number;
}) {
  const { t } = useTranslation();
  const [remember, setRemember] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const relayName = getRelayDisplayName(challenge.relayUrl);

  async function handleAllow() {
    setIsAuthenticating(true);
    try {
      if (remember) {
        authManager.setPreference(challenge.relayUrl, "always");
      }
      await authManager.authenticate(challenge.relayUrl);
      toast.dismiss(toastId);
    } catch (err) {
      console.error("Auth failed:", err);
      toast.dismiss(toastId);
      toast.error(
        t("auth.failed", {
          relay: relayName,
          defaultValue: "Authentication failed for {{relay}}",
        }),
      );
    } finally {
      setIsAuthenticating(false);
    }
  }

  function handleDeny() {
    if (remember) {
      authManager.setPreference(challenge.relayUrl, "never");
    }
    authManager.reject(challenge.relayUrl, true);
    toast.dismiss(toastId);
  }

  return (
    <div className="flex flex-col gap-2 w-full bg-background text-foreground border border-border rounded-lg p-4 shadow-lg">
      <div className="flex items-center gap-2">
        <RelayFavicon url={challenge.relayUrl} />
        <span className="text-sm font-medium truncate">{relayName}</span>
      </div>
      <p className="text-xs text-muted-foreground">
        {t("auth.request", {
          defaultValue: "This relay is requesting authentication",
        })}
      </p>
      <div className="flex items-center gap-2">
        <Checkbox
          id={`remember-${challenge.relayUrl}`}
          checked={remember}
          onCheckedChange={(checked) => setRemember(checked === true)}
        />
        <label
          htmlFor={`remember-${challenge.relayUrl}`}
          className="text-xs text-muted-foreground cursor-pointer"
        >
          {t("auth.remember", { defaultValue: "Remember this choice" })}
        </label>
      </div>
      <div className="flex gap-2 justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={handleDeny}
          disabled={isAuthenticating}
        >
          <ShieldX className="size-3.5 mr-1" />
          {t("auth.deny", { defaultValue: "Deny" })}
        </Button>
        <Button
          size="sm"
          onClick={handleAllow}
          disabled={isAuthenticating}
        >
          <ShieldCheck className="size-3.5 mr-1" />
          {isAuthenticating
            ? t("auth.authenticating", { defaultValue: "Signing..." })
            : t("auth.allow", { defaultValue: "Allow" })}
        </Button>
      </div>
    </div>
  );
}

/**
 * Subscribes to pending auth challenges from relay-auth-manager
 * and shows interactive toast prompts for each one.
 */
export function AuthToastProvider() {
  const activeToasts = useRef(new Set<string>());

  useEffect(() => {
    const subscription = authManager.pendingChallenges$.subscribe(
      (challenges: PendingAuthChallenge[]) => {
        // Show toasts for new challenges
        for (const challenge of challenges) {
          if (activeToasts.current.has(challenge.relayUrl)) continue;
          activeToasts.current.add(challenge.relayUrl);

          const toastId = `auth-${challenge.relayUrl}`;
          toast.custom(
            (id) => (
              <AuthToastContent challenge={challenge} toastId={id} />
            ),
            {
              id: toastId,
              duration: Infinity,
              onDismiss: () => {
                activeToasts.current.delete(challenge.relayUrl);
                // If dismissed without action, reject for this session
                authManager.reject(challenge.relayUrl, true);
              },
              onAutoClose: () => {
                activeToasts.current.delete(challenge.relayUrl);
              },
            },
          );
        }

        // Dismiss toasts for challenges that are no longer pending
        const pendingUrls = new Set(challenges.map((c) => c.relayUrl));
        for (const url of activeToasts.current) {
          if (!pendingUrls.has(url)) {
            toast.dismiss(`auth-${url}`);
            activeToasts.current.delete(url);
          }
        }
      },
    );

    return () => subscription.unsubscribe();
  }, []);

  return null;
}

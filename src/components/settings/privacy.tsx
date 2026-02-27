import { useTranslation } from "react-i18next";
import { Shield, VenetianMask, Trash2 } from "lucide-react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useState, useEffect } from "react";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { authManager } from "@/lib/ndk";
import { RelayLink } from "../nostr/relay";
import type { AuthPreference } from "@/lib/relay-auth-manager";

const privacySchema = z.object({});

function RelayAuthPreferences() {
  const { t } = useTranslation();
  const [preferences, setPreferences] = useState<[string, AuthPreference][]>(
    [],
  );

  useEffect(() => {
    const prefs = authManager.getAllPreferences();
    setPreferences(Array.from(prefs.entries()));
  }, []);

  function updatePreference(url: string, newPref: AuthPreference) {
    authManager.setPreference(url, newPref);
    setPreferences((prev) =>
      prev.map(([u, p]) => (u === url ? [u, newPref] : [u, p])),
    );
  }

  function removePreference(url: string) {
    authManager.removePreference(url);
    setPreferences((prev) => prev.filter(([u]) => u !== url));
  }

  function clearAll() {
    for (const [url] of preferences) {
      authManager.removePreference(url);
    }
    setPreferences([]);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-0.5">
        <div className="flex flex-row gap-1.5 items-center">
          <Shield className="size-4 text-muted-foreground" />
          <h3 className="text-sm uppercase font-light text-muted-foreground">
            {t("settings.privacy.relay-auth.title")}
          </h3>
        </div>
        <p className="text-xs text-muted-foreground">
          {t("settings.privacy.relay-auth.description")}
        </p>
      </div>

      {preferences.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t("settings.privacy.relay-auth.no-preferences")}
        </p>
      ) : (
        <div className="flex flex-col gap-1">
          {preferences.map(([url, pref]) => (
            <div
              key={url}
              className="flex flex-row items-center justify-between gap-2 py-1"
            >
              <RelayLink
                relay={url}
                classNames={{
                  name: "text-sm font-mono hover:underline hover:decoration-dotted truncate",
                }}
              />
              <div className="flex flex-row items-center gap-2">
                <Select
                  value={pref}
                  onValueChange={(value: AuthPreference) =>
                    updatePreference(url, value)
                  }
                  aria-label={t("settings.privacy.relay-auth.select-label")}
                >
                  <SelectTrigger className="w-[80px] h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="always">
                      {t("settings.privacy.relay-auth.allow")}
                    </SelectItem>
                    <SelectItem value="never">
                      {t("settings.privacy.relay-auth.deny")}
                    </SelectItem>
                    <SelectItem value="ask">
                      {t("settings.privacy.relay-auth.ask")}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={() => removePreference(url)}
                  aria-label={t("settings.privacy.relay-auth.delete-label")}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
          <Button
            variant="destructive"
            size="sm"
            className="self-end mt-1"
            onClick={clearAll}
          >
            {t("settings.privacy.relay-auth.clear-all")}
          </Button>
        </div>
      )}
    </div>
  );
}

export function Privacy() {
  const { t } = useTranslation();
  const form = useForm<z.infer<typeof privacySchema>>({
    resolver: zodResolver(privacySchema),
    defaultValues: {},
  });

  function onSubmit() {
    console.log("submit");
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-3"
      >
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-row gap-1 items-center flex-wrap">
            <VenetianMask className="size-4 text-muted-foreground" />
            <h4 className="text-sm uppercase font-light text-muted-foreground">
              {t("settings.privacy.title")}
            </h4>
          </div>
        </div>

        <div className="mt-3">
          <RelayAuthPreferences />
        </div>
      </form>
    </Form>
  );
}

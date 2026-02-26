import { useTranslation } from "react-i18next";
import {
  VenetianMask,
  MessageSquare,
  MessageSquareDot,
  Server,
  Shield,
  Plus,
  Trash2,
  RotateCcw,
} from "lucide-react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  Form,
  FormField,
  FormItem,
  FormControl,
  FormLabel,
  FormDescription,
  FormMessage,
} from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAtom } from "jotai";
import {
  privateMessagesEnabledAtom,
  dmRelayListAtom,
  unreadSyncEnabledAtom,
} from "@/app/store";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { NDKEvent, NDKKind } from "@nostr-dev-kit/ndk";
import { NostrEvent } from "nostr-tools";
import { useNDK, authManager } from "@/lib/ndk";
import { useRelays } from "@/lib/nostr";
import { useRelaySet } from "@/lib/nostr";
import { RelayLink } from "../nostr/relay";
import type { AuthPreference } from "@/lib/relay-auth-manager";

function DmRelay({
  url,
  canRemove,
  onRemove,
}: {
  url: string;
  canRemove: boolean;
  onRemove: () => void;
}) {
  return (
    <div className="flex flex-row items-center justify-between py-1">
      <div className="flex flex-row items-center gap-2">
        <RelayLink
          relay={url}
          classNames={{
            name: "text-sm font-mono hover:underline hover:decoration-dotted",
          }}
        />
      </div>
      <Button
        disabled={!canRemove}
        variant="ghost"
        size="icon"
        className="size-8"
        onClick={onRemove}
      >
        <Trash2 className="size-4 text-destructive" />
      </Button>
    </div>
  );
}

function AddRelayForm({
  isSaving,
  onAdd,
}: {
  isSaving: boolean;
  onAdd: (url: string) => void;
}) {
  const { t } = useTranslation();
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      // Ensure URL starts with wss://
      const fullUrl = url.startsWith("wss://") ? url : `wss://${url}`;

      // Validate URL
      new URL(fullUrl);

      setUrl("");
      onAdd(fullUrl);
    } catch {
      setError(t("settings.privacy.dm-relays.invalid-url"));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <div className="flex flex-row gap-2">
        <Input
          type="text"
          placeholder={t("settings.privacy.dm-relays.placeholder")}
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            setError(null);
          }}
          className="flex-1"
        />
        <Button type="submit" disabled={isSaving}>
          <div className="flex flex-row items-center gap-2">
            {isSaving ? (
              <RotateCcw className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            {t("settings.privacy.dm-relays.add")}
          </div>
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </form>
  );
}

function DmRelayList({
  relays,
  className,
}: {
  relays: { url: string }[];
  className?: string;
}) {
  const { t } = useTranslation();
  const [dmRelayList, setDmRelayList] = useAtom(dmRelayListAtom);
  const [isSaving, setIsSaving] = useState(false);
  const ndk = useNDK();
  const myRelays = useRelays();
  const relaySet = useRelaySet(myRelays);

  async function saveDmRelayList(relayUrls: string[]) {
    try {
      setIsSaving(true);
      const event = new NDKEvent(ndk, {
        kind: NDKKind.DirectMessageReceiveRelayList,
        content: "",
        tags: [...relayUrls.map((url) => ["relay", url])],
      } as NostrEvent);
      await event.publish(relaySet);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  }

  function addRelay(url: string) {
    // Check if the relay already exists
    if (dmRelayList.relays.some((r) => r.url === url)) {
      return;
    }

    const newRelays = [...dmRelayList.relays, { url }];
    const relayUrls = newRelays.map((r) => r.url);
    saveDmRelayList(relayUrls);
    setDmRelayList({
      ...dmRelayList,
      relays: newRelays,
    });
  }

  function removeRelay(url: string) {
    const newRelays = dmRelayList.relays.filter((r) => r.url !== url);
    const relayUrls = newRelays.map((r) => r.url);
    saveDmRelayList(relayUrls);
    setDmRelayList({
      ...dmRelayList,
      relays: newRelays,
    });
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex flex-col gap-1">
        {relays.length === 0 && (
          <p className="text-sm text-muted-foreground">
            {t("private-group.no-dm-relays")}
          </p>
        )}
        {relays.map((relay) => (
          <DmRelay
            key={relay.url}
            url={relay.url}
            canRemove={relays.length > 0}
            onRemove={() => removeRelay(relay.url)}
          />
        ))}
      </div>
      <AddRelayForm isSaving={isSaving} onAdd={addRelay} />
    </div>
  );
}

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

const privacySchema = z.object({
  privateMessagesEnabled: z.boolean().default(false),
  unreadSyncEnabled: z.boolean().default(false),
});

export function Privacy() {
  const { t } = useTranslation();
  const [privateMessagesEnabled, setPrivateMessagesEnabled] = useAtom(
    privateMessagesEnabledAtom,
  );
  const [unreadSyncEnabled, setUnreadSyncEnabled] = useAtom(
    unreadSyncEnabledAtom,
  );
  const [dmRelayList] = useAtom(dmRelayListAtom);

  const form = useForm<z.infer<typeof privacySchema>>({
    resolver: zodResolver(privacySchema),
    defaultValues: {
      privateMessagesEnabled,
      unreadSyncEnabled,
    },
  });

  function onSubmit() {
    console.log("submit");
  }

  function togglePrivateMessages(enabled: boolean) {
    setPrivateMessagesEnabled(enabled);
  }

  function toggleUnreadSync(enabled: boolean) {
    setUnreadSyncEnabled(enabled);
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

          <FormField
            control={form.control}
            name="privateMessagesEnabled"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between p-1">
                <div className="space-y-0.5">
                  <FormLabel className="flex items-center gap-2">
                    <MessageSquare className="size-4 text-muted-foreground" />
                    {t("settings.privacy.privateMessages.title")}
                  </FormLabel>
                  <FormDescription>
                    {t("settings.privacy.privateMessages.description")}
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={(checked) => {
                      field.onChange(checked);
                      togglePrivateMessages(checked);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {privateMessagesEnabled && (
          <div className="flex flex-col gap-3 mt-2">
            <div className="flex flex-col gap-0.5">
              <div className="flex flex-row gap-1.5 items-center">
                <Server className="size-4 text-muted-foreground" />
                <h3 className="text-sm uppercase font-light text-muted-foreground">
                  {t("settings.privacy.dm-relays.title")}
                </h3>
              </div>
              <p className="text-xs">
                {t("settings.privacy.dm-relays.description")}
              </p>
            </div>
            <DmRelayList relays={dmRelayList.relays} />
          </div>
        )}

        <div className="flex flex-col gap-1.5 mt-3">
          <FormField
            control={form.control}
            name="unreadSyncEnabled"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between p-1">
                <div className="space-y-0.5">
                  <FormLabel className="flex items-center gap-2">
                    <MessageSquareDot className="size-4 text-muted-foreground" />
                    {t("settings.privacy.unreadSync.title")}
                  </FormLabel>
                  <FormDescription>
                    {t("settings.privacy.unreadSync.description")}
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={(checked) => {
                      field.onChange(checked);
                      toggleUnreadSync(checked);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="mt-3">
          <RelayAuthPreferences />
        </div>
      </form>
    </Form>
  );
}

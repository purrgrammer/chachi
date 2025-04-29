import { useTranslation } from "react-i18next";
import { VenetianMask, MessageSquare, Server, Plus, Trash2, RotateCcw } from "lucide-react";
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
import { useAtom } from "jotai";
import { privateMessagesEnabledAtom, dmRelayListAtom } from "@/app/store";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { NDKEvent, NDKKind } from "@nostr-dev-kit/ndk";
import { NostrEvent } from "nostr-tools";
import { useNDK } from "@/lib/ndk";
import { useRelays } from "@/lib/nostr";
import { useRelaySet } from "@/lib/nostr";
import { RelayLink } from "../nostr/relay";

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
          classNames={{ name: "text-sm font-mono hover:underline hover:decoration-dotted" }}
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
  const relaySet = useRelaySet(myRelays)

  async function saveDmRelayList(relayUrls: string[]) {
    try {
      setIsSaving(true);
      const event = new NDKEvent(ndk, {
        kind: NDKKind.DirectMessageReceiveRelayList,
        content: "",
        tags: [
          ...relayUrls.map((url) => ["relay", url]),
        ],
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

const privacySchema = z.object({
  privateMessagesEnabled: z.boolean().default(false),
});

export function Privacy() {
  const { t } = useTranslation();
  const [privateMessagesEnabled, setPrivateMessagesEnabled] = useAtom(privateMessagesEnabledAtom);
  const [dmRelayList] = useAtom(dmRelayListAtom);
  
  const form = useForm<z.infer<typeof privacySchema>>({
    resolver: zodResolver(privacySchema),
    defaultValues: {
      privateMessagesEnabled,
    },
  });

  function onSubmit() {
    console.log("submit");
  }

  function togglePrivateMessages(enabled: boolean) {
    setPrivateMessagesEnabled(enabled);
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
      </form>
    </Form>
  );
} 
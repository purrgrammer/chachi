import { useState, useEffect } from "react";
import { useAtomValue } from "jotai";
import { toast } from "sonner";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Plus, X, Server, CloudUpload, Landmark, Loader2 } from "lucide-react";
import { NostrEvent } from "nostr-tools";
import { relaysAtom, mediaServersAtom, mintsAtom } from "@/app/store";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { getRelayHost, isRelayURL } from "@/lib/relay";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { COMMUNIKEY } from "@/lib/kinds";
import { useTranslation } from "react-i18next";

export function normalizeRelayUrl(url: string): string {
  if (!url) return "";
  return url.startsWith("wss://")
    ? url
    : `wss://${url.replace(/^(ws:\/\/|http:\/\/|https:\/\/)/, "")}`;
}

export function normalizeServerUrl(url: string): string {
  if (!url) return "";
  return url.startsWith("http")
    ? url
    : `https://${url.replace(/^wss?:\/\//, "")}`;
}

export const communityFormSchema = z.object({
  relay: z.string().url(),
  backupRelays: z.array(z.string().url()).default([]),
  primaryBlossomServer: z.string().url().optional(),
  backupBlossomServers: z.array(z.string().url()).default([]),
  communityMint: z.string().url().optional(),
  description: z.string().optional(),
  location: z.string().optional(),
  geohash: z.string().optional(),
});

export type CommunityFormValues = z.infer<typeof communityFormSchema>;

interface RelayPillProps {
  relay: string;
  onRemove: () => void;
  disabled?: boolean;
}

function RelayPill({ relay, onRemove, disabled = false }: RelayPillProps) {
  const host = getRelayHost(relay);

  return (
    <Badge
      variant="secondary"
      className="flex items-center gap-2 py-1 px-2 h-7"
    >
      <div className="flex items-center gap-1.5">
        <Avatar className="h-4 w-4 rounded-sm">
          <AvatarFallback className="bg-muted text-xs">
            {host.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <span className="font-mono text-[10px] font-normal">{host}</span>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-4 w-4 p-0 ml-1"
        onClick={onRemove}
        disabled={disabled}
      >
        <X className="h-3 w-3" />
      </Button>
    </Badge>
  );
}

interface ServerPillProps {
  server: string;
  onRemove: () => void;
  disabled?: boolean;
}

function ServerPill({ server, onRemove, disabled = false }: ServerPillProps) {
  const [isImageLoading, setIsImageLoading] = useState(true);

  const url = new URL(server);
  const hostname = url?.hostname || "";

  const mainDomain = hostname.split(".").slice(-2).join(".");
  const faviconUrl = mainDomain ? `https://${mainDomain}/favicon.ico` : "";

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isImageLoading) {
        setIsImageLoading(false);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [isImageLoading]);

  return (
    <Badge
      variant="secondary"
      className="flex items-center gap-2 py-1 px-2 h-7"
    >
      <div className="flex items-center gap-1.5">
        <Avatar className="h-4 w-4 rounded-sm">
          {isImageLoading ? (
            <AvatarFallback className="bg-muted">
              <Loader2 className="h-2 w-2 animate-spin" />
            </AvatarFallback>
          ) : (
            <>
              <AvatarImage
                src={faviconUrl}
                alt={hostname}
                className="object-cover"
                onLoad={() => setIsImageLoading(false)}
                onError={() => {
                  setIsImageLoading(false);
                }}
              />
              <AvatarFallback className="bg-muted text-xs">
                {hostname.charAt(0).toUpperCase()}
              </AvatarFallback>
            </>
          )}
        </Avatar>
        <span className="font-mono text-[10px] font-normal">{hostname}</span>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-4 w-4 p-0 ml-1"
        onClick={onRemove}
        disabled={disabled}
      >
        <X className="h-3 w-3" />
      </Button>
    </Badge>
  );
}

interface CommunityFormProps {
  onSubmit: (values: CommunityFormValues) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  initialValues?: Partial<CommunityFormValues>;
  submitLabel?: string;
  cancelLabel?: string;
}

export function CommunityForm({
  onSubmit,
  onCancel,
  isLoading = false,
  initialValues,
  submitLabel,
  cancelLabel,
}: CommunityFormProps) {
  const { t } = useTranslation();
  const userRelaysData = useAtomValue(relaysAtom);
  const mediaServers = useAtomValue(mediaServersAtom);
  const userMints = useAtomValue(mintsAtom);

  const [isBackupRelaysOpen, setIsBackupRelaysOpen] = useState(false);
  const [isBackupBlossomOpen, setIsBackupBlossomOpen] = useState(false);
  const [backupRelayInput, setBackupRelayInput] = useState("");
  const [backupBlossomInput, setBackupBlossomInput] = useState("");

  const userRelayUrls = userRelaysData
    .filter((relay) => relay.url && isRelayURL(relay.url))
    .map((relay) => relay.url);

  const form = useForm<CommunityFormValues>({
    resolver: zodResolver(communityFormSchema),
    defaultValues: {
      relay:
        initialValues?.relay ||
        (userRelayUrls.length > 0 ? userRelayUrls[0] : ""),
      backupRelays: initialValues?.backupRelays || userRelayUrls.slice(1),
      primaryBlossomServer:
        initialValues?.primaryBlossomServer ||
        (mediaServers.length > 0 ? mediaServers[0] : ""),
      backupBlossomServers:
        initialValues?.backupBlossomServers || mediaServers.slice(1),
      communityMint:
        initialValues?.communityMint ||
        (userMints.length > 0 ? userMints[0] : ""),
      description: initialValues?.description || "",
      location: initialValues?.location || "",
      geohash: initialValues?.geohash || "",
    },
  });

  useEffect(() => {
    const watchBackupRelays = form.watch("backupRelays");
    const watchBackupBlossomServers = form.watch("backupBlossomServers");

    if (watchBackupRelays.length > 0 && !isBackupRelaysOpen) {
      setIsBackupRelaysOpen(true);
    }

    if (watchBackupBlossomServers.length > 0 && !isBackupBlossomOpen) {
      setIsBackupBlossomOpen(true);
    }
  }, [form.watch("backupRelays"), form.watch("backupBlossomServers")]);

  const watchBackupRelays = form.watch("backupRelays");
  const watchBackupBlossomServers = form.watch("backupBlossomServers");
  const primaryRelay = form.watch("relay");
  const primaryBlossomServer = form.watch("primaryBlossomServer");

  const addBackupRelay = () => {
    if (!backupRelayInput) return;

    const normalizedUrl = normalizeRelayUrl(backupRelayInput);

    // Check for duplicate with primary relay first
    if (normalizeRelayUrl(primaryRelay) === normalizedUrl) {
      toast.error(
        t("group.create.community.form.backup_relays.error_duplicate_primary"),
      );
      setBackupRelayInput("");
      return;
    }

    // Then check for duplicate in the backup list
    if (watchBackupRelays.includes(normalizedUrl)) {
      toast.error(
        t("group.create.community.form.backup_relays.error_duplicate"),
      );
      setBackupRelayInput("");
      return;
    }

    // If we got here, it's safe to add
    if (isRelayURL(normalizedUrl)) {
      form.setValue("backupRelays", [...watchBackupRelays, normalizedUrl]);
      setBackupRelayInput("");
    }
  };

  const removeBackupRelay = (relay: string) => {
    form.setValue(
      "backupRelays",
      watchBackupRelays.filter((r) => r !== relay),
    );
  };

  const addBackupBlossomServer = () => {
    if (!backupBlossomInput) return;

    const normalizedUrl = normalizeServerUrl(backupBlossomInput);

    // Check for duplicate with primary server first
    if (
      primaryBlossomServer &&
      normalizeServerUrl(primaryBlossomServer) === normalizedUrl
    ) {
      toast.error(
        t("group.create.community.form.backup_blossom.error_duplicate_primary"),
      );
      setBackupBlossomInput("");
      return;
    }

    // Then check for duplicate in the backup list
    if (watchBackupBlossomServers.includes(normalizedUrl)) {
      toast.error(
        t("group.create.community.form.backup_blossom.error_duplicate"),
      );
      setBackupBlossomInput("");
      return;
    }

    // If we got here, it's safe to add
    if (normalizedUrl) {
      form.setValue("backupBlossomServers", [
        ...watchBackupBlossomServers,
        normalizedUrl,
      ]);
      setBackupBlossomInput("");
    }
  };

  const removeBackupBlossomServer = (server: string) => {
    form.setValue(
      "backupBlossomServers",
      watchBackupBlossomServers.filter((s) => s !== server),
    );
  };

  const handleSubmit = async (values: CommunityFormValues) => {
    await onSubmit(values);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="relay"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-1.5">
                <Server className="h-3.5 w-3.5 text-muted-foreground" />
                {t("group.create.community.form.relay.label")}
              </FormLabel>
              <FormControl>
                <div className="flex flex-row gap-1 items-center">
                  <Input
                    disabled={isLoading}
                    placeholder={t(
                      "group.create.community.form.relay.placeholder",
                    )}
                    {...field}
                  />
                  {/*<NewRelay onRelayCreated={field.onChange} />*/}
                </div>
              </FormControl>
              <FormDescription>
                {t("group.create.community.form.relay.description")}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Accordion
          type="single"
          collapsible
          value={isBackupRelaysOpen ? "item-1" : ""}
          onValueChange={(value) => setIsBackupRelaysOpen(value === "item-1")}
        >
          <AccordionItem value="item-1" className="border rounded-md px-4">
            <AccordionTrigger className="py-2">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-medium flex items-center gap-1.5">
                  <Server className="h-3.5 w-3.5 text-muted-foreground" />
                  {t("group.create.community.form.backup_relays.label")}
                </h4>
                {watchBackupRelays.length > 0 && (
                  <span className="text-muted-foreground text-xs">
                    ({watchBackupRelays.length})
                  </span>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="flex flex-wrap gap-2 mb-2">
                {watchBackupRelays.map((relay) => (
                  <RelayPill
                    key={relay}
                    relay={relay}
                    onRemove={() => removeBackupRelay(relay)}
                    disabled={isLoading}
                  />
                ))}
              </div>

              <FormDescription className="mb-2">
                {t("group.create.community.form.backup_relays.description")}
              </FormDescription>

              <div className="flex gap-2 mt-2 px-1">
                <Input
                  value={backupRelayInput}
                  onChange={(e) => setBackupRelayInput(e.target.value)}
                  placeholder={t(
                    "group.create.community.form.backup_relays.add_placeholder",
                  )}
                  disabled={isLoading}
                  className="flex-1 h-9"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={addBackupRelay}
                  disabled={
                    isLoading ||
                    !backupRelayInput ||
                    !isRelayURL(normalizeRelayUrl(backupRelayInput)) ||
                    normalizeRelayUrl(backupRelayInput) ===
                      normalizeRelayUrl(primaryRelay) ||
                    watchBackupRelays.includes(
                      normalizeRelayUrl(backupRelayInput),
                    )
                  }
                  className="h-9 px-3 flex items-center gap-1"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {t("group.create.community.form.backup_relays.add")}
                </Button>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <FormField
          control={form.control}
          name="primaryBlossomServer"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-1.5">
                <CloudUpload className="h-3.5 w-3.5 text-muted-foreground" />
                {t("group.create.community.form.primary_blossom.label")}
              </FormLabel>
              <FormControl>
                <Input
                  disabled={isLoading}
                  placeholder={t(
                    "group.create.community.form.primary_blossom.placeholder",
                  )}
                  {...field}
                  value={field.value || ""}
                />
              </FormControl>
              <FormDescription>
                {t("group.create.community.form.primary_blossom.description")}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Accordion
          type="single"
          collapsible
          value={isBackupBlossomOpen ? "item-1" : ""}
          onValueChange={(value) => setIsBackupBlossomOpen(value === "item-1")}
        >
          <AccordionItem value="item-1" className="border rounded-md px-4">
            <AccordionTrigger className="py-2">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-medium flex items-center gap-1.5">
                  <CloudUpload className="h-3.5 w-3.5 text-muted-foreground" />
                  {t("group.create.community.form.backup_blossom.label")}
                </h4>
                {watchBackupBlossomServers.length > 0 && (
                  <span className="text-muted-foreground text-xs">
                    ({watchBackupBlossomServers.length})
                  </span>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="flex flex-wrap gap-2 mb-2">
                {watchBackupBlossomServers.map((server) => (
                  <ServerPill
                    key={server}
                    server={server}
                    onRemove={() => removeBackupBlossomServer(server)}
                    disabled={isLoading}
                  />
                ))}
              </div>

              <FormDescription className="mb-2">
                {t("group.create.community.form.backup_blossom.description")}
              </FormDescription>

              <div className="flex gap-2 mt-2 px-1">
                <Input
                  value={backupBlossomInput}
                  onChange={(e) => setBackupBlossomInput(e.target.value)}
                  placeholder={t(
                    "group.create.community.form.backup_blossom.add_placeholder",
                  )}
                  disabled={isLoading}
                  className="flex-1 h-9"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={addBackupBlossomServer}
                  disabled={
                    isLoading ||
                    !backupBlossomInput ||
                    primaryBlossomServer ===
                      normalizeServerUrl(backupBlossomInput) ||
                    watchBackupBlossomServers.includes(
                      normalizeServerUrl(backupBlossomInput),
                    )
                  }
                  className="h-9 px-3 flex items-center gap-1"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {t("group.create.community.form.backup_blossom.add")}
                </Button>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <FormField
          control={form.control}
          name="communityMint"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-1.5">
                <Landmark className="h-3.5 w-3.5 text-muted-foreground" />
                {t("group.create.community.form.mint.label")}
              </FormLabel>
              <FormControl>
                <Input
                  disabled={isLoading}
                  placeholder={t(
                    "group.create.community.form.mint.placeholder",
                  )}
                  {...field}
                  value={field.value || ""}
                />
              </FormControl>
              <FormDescription>
                {t("group.create.community.form.mint.description")}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex flex-row justify-between items-center gap-4 mt-6">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
              className="h-10"
            >
              {cancelLabel || t("back")}
            </Button>
          )}
          <Button
            disabled={
              isLoading ||
              !form.getValues("relay") ||
              !isRelayURL(normalizeRelayUrl(form.getValues("relay")))
            }
            type="submit"
            className="h-10 ml-auto"
          >
            {submitLabel || t("group.create.form.submit.trigger")}
          </Button>
        </div>
      </form>
    </Form>
  );
}

export function createCommunityEvent(
  values: CommunityFormValues,
  pubkey: string,
): NostrEvent {
  const normalizedValues = {
    ...values,
    pubkey,
    relay: normalizeRelayUrl(values.relay),
    backupRelays: values.backupRelays.map(normalizeRelayUrl),
    primaryBlossomServer: values.primaryBlossomServer
      ? normalizeServerUrl(values.primaryBlossomServer)
      : undefined,
    backupBlossomServers: values.backupBlossomServers.map(normalizeServerUrl),
  };

  const event = {
    kind: COMMUNIKEY,
    content: "",
    tags: [["r", normalizedValues.relay]],
  } as NostrEvent;

  if (normalizedValues.backupRelays.length > 0) {
    normalizedValues.backupRelays.forEach((relay) => {
      event.tags.push(["r", relay]);
    });
  }

  if (normalizedValues.primaryBlossomServer) {
    event.tags.push(["blossom", normalizedValues.primaryBlossomServer]);
  }

  if (normalizedValues.backupBlossomServers.length > 0) {
    normalizedValues.backupBlossomServers.forEach((server) => {
      event.tags.push(["blossom", server]);
    });
  }

  if (normalizedValues.communityMint) {
    event.tags.push(["mint", normalizedValues.communityMint, "cashu"]);
  }

  if (normalizedValues.description) {
    event.tags.push(["description", normalizedValues.description]);
  }

  if (normalizedValues.location) {
    event.tags.push(["location", normalizedValues.location]);
  }

  if (normalizedValues.geohash) {
    event.tags.push(["g", normalizedValues.geohash]);
  }

  return event;
}

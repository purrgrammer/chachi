import { useState, ReactNode, useEffect, useMemo } from "react";
import { useAtomValue } from "jotai";
import { toast } from "sonner";
import { z } from "zod";
import { NDKEvent, NDKKind } from "@nostr-dev-kit/ndk";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  Plus,
  X,
  Castle,
  Server,
  Landmark,
  CloudUpload,
  Loader2,
} from "lucide-react";
import { NostrEvent } from "nostr-tools";
import {
  groupsContentAtom,
  relaysAtom,
  mediaServersAtom,
  mintsAtom,
} from "@/app/store";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Textarea } from "@/components/ui/textarea";
import { UploadImage } from "@/components/upload-image";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useRelays, useRelaySet } from "@/lib/nostr";
import { useCreateGroup, useEditGroup } from "@/lib/nostr/groups";
import {
  nip29Relays,
  getRelayHost,
  isRelayURL,
  useRelayInfo,
} from "@/lib/relay";
//import { NewRelay } from "@/components/nostr/relay/new";
import { useAccount, usePubkey } from "@/lib/account";
import { useMyGroups } from "@/lib/groups";
import { randomId } from "@/lib/id";
import { useNDK } from "@/lib/ndk";
import { useNavigate } from "@/lib/navigation";
import type { Group } from "@/lib/types";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { User } from "@/components/nostr/user";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { COMMUNIKEY } from "@/lib/kinds";

function normalizeRelayUrl(url: string): string {
  if (!url) return "";
  return url.startsWith("wss://")
    ? url
    : `wss://${url.replace(/^(ws:\/\/|http:\/\/|https:\/\/)/, "")}`;
}

function normalizeServerUrl(url: string): string {
  if (!url) return "";
  return url.startsWith("http")
    ? url
    : `https://${url.replace(/^wss?:\/\//, "")}`;
}

const formSchema = z.object({
  name: z.string().min(1).max(140),
  picture: z.string().url().optional(),
  about: z.string().min(0).max(500).optional(),
  visibility: z.enum(["public", "private"]).default("public"),
  access: z.enum(["open", "closed"]).default("open"),
  relay: z.string().url(),
});

const communityFormSchema = z.object({
  relay: z.string().url(),
  backupRelays: z.array(z.string().url()).default([]),
  primaryBlossomServer: z.string().url().optional(),
  backupBlossomServers: z.array(z.string().url()).default([]),
  communityMint: z.string().url().optional(),
});

type GroupType = "nip29" | "community" | null;

interface PillProps {
  onRemove: () => void;
  disabled?: boolean;
}

function RelayPill({
  relay,
  onRemove,
  disabled = false,
}: PillProps & { relay: string }) {
  const { data: relayInfo, isLoading } = useRelayInfo(relay);
  const host = getRelayHost(relay);

  return (
    <Badge
      variant="secondary"
      className="flex items-center gap-2 py-1 px-2 h-7"
    >
      <div className="flex items-center gap-1.5">
        <Avatar className="h-4 w-4 rounded-sm">
          {isLoading ? (
            <AvatarFallback className="bg-muted">
              <Loader2 className="h-2 w-2 animate-spin" />
            </AvatarFallback>
          ) : (
            <>
              <AvatarImage
                src={relayInfo?.icon}
                alt={relayInfo?.name || host}
                className="object-cover"
              />
              <AvatarFallback className="bg-muted text-xs">
                {host.charAt(0).toUpperCase()}
              </AvatarFallback>
            </>
          )}
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

function ServerPill({
  server,
  onRemove,
  disabled = false,
}: PillProps & { server: string }) {
  const [isImageLoading, setIsImageLoading] = useState(true);

  const url = useMemo(() => {
    try {
      return new URL(server);
    } catch {
      return null;
    }
  }, [server]);

  const hostname = url?.hostname || "";

  const mainDomain = useMemo(() => {
    const parts = hostname.split(".");
    return parts.length >= 2 ? parts.slice(-2).join(".") : hostname;
  }, [hostname]);

  const faviconUrl = useMemo(
    () => (mainDomain ? `https://${mainDomain}/favicon.ico` : ""),
    [mainDomain],
  );

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

export function CreateGroup({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) {
  const { t } = useTranslation();
  const ndk = useNDK();
  const [showDialog, setShowDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [groupType, setGroupType] = useState<GroupType>(null);
  const [isBackupRelaysOpen, setIsBackupRelaysOpen] = useState(false);
  const [isBackupBlossomOpen, setIsBackupBlossomOpen] = useState(false);
  const [backupRelayInput, setBackupRelayInput] = useState("");
  const [backupBlossomInput, setBackupBlossomInput] = useState("");

  const groups = useMyGroups();
  const groupsContent = useAtomValue(groupsContentAtom);
  const userRelaysData = useAtomValue(relaysAtom);
  const mediaServers = useAtomValue(mediaServersAtom);
  const userMints = useAtomValue(mintsAtom);
  const createGroup = useCreateGroup();
  const editGroup = useEditGroup();
  const account = useAccount();
  const userPubkey = usePubkey();
  const canSign = account?.pubkey && !account.isReadOnly;
  const navigate = useNavigate();
  const userRelays = useRelays();
  const relaySet = useRelaySet(userRelays.filter((r) => isRelayURL(r)));

  const userRelayUrls = userRelaysData
    .filter((relay) => relay.url && isRelayURL(relay.url))
    .map((relay) => relay.url);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      relay: nip29Relays[0],
    },
  });

  const communityForm = useForm<z.infer<typeof communityFormSchema>>({
    resolver: zodResolver(communityFormSchema),
    defaultValues: {
      relay: userRelayUrls.length > 0 ? userRelayUrls[0] : "",
      backupRelays: userRelayUrls.slice(1),
      primaryBlossomServer: mediaServers.length > 0 ? mediaServers[0] : "",
      backupBlossomServers: mediaServers.slice(1),
      communityMint: userMints.length > 0 ? userMints[0] : "",
    },
  });

  useEffect(() => {
    const watchBackupRelays = communityForm.watch("backupRelays");
    const watchBackupBlossomServers = communityForm.watch(
      "backupBlossomServers",
    );

    if (watchBackupRelays.length > 0 && !isBackupRelaysOpen) {
      setIsBackupRelaysOpen(true);
    }

    if (watchBackupBlossomServers.length > 0 && !isBackupBlossomOpen) {
      setIsBackupBlossomOpen(true);
    }
  }, [
    communityForm.watch("backupRelays"),
    communityForm.watch("backupBlossomServers"),
  ]);

  async function bookmarkGroup(group: Group) {
    try {
      const newGroups = [...groups, group];
      const event = new NDKEvent(ndk, {
        kind: NDKKind.SimpleGroupList,
        content: groupsContent,
        tags: newGroups.map((g) => ["group", g.id, g.relay]),
      } as NostrEvent);
      await event.publish(relaySet);
    } catch (err) {
      console.error(err);
      toast.error(t("group.bookmark.error"));
    }
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setIsLoading(true);
      const id = randomId();
      const relay = values.relay;
      const group = await createGroup(id, relay);
      const metadata = { ...group, ...values };
      await editGroup(metadata);
      toast.success(t("group.create.form.submit.success"));
      navigate(`/${getRelayHost(relay)}/${id}`);
      setShowDialog(false);
      resetForm();
      bookmarkGroup(group);
    } catch (err) {
      console.error(err);
      toast.error(t("group.create.form.submit.error"));
    } finally {
      setIsLoading(false);
    }
  }

  function resetForm() {
    form.reset({
      name: "",
      picture: "",
      about: "",
      visibility: "public",
      access: "open",
      relay: nip29Relays[0],
    });

    communityForm.reset({
      relay: userRelayUrls.length > 0 ? userRelayUrls[0] : "",
      backupRelays: userRelayUrls.slice(1),
      primaryBlossomServer: mediaServers.length > 0 ? mediaServers[0] : "",
      backupBlossomServers: mediaServers.slice(1),
      communityMint: userMints.length > 0 ? userMints[0] : "",
    });

    setGroupType(null);
  }

  function onOpenChange(open: boolean) {
    if (!open) resetForm();
    setShowDialog(open);
  }

  function renderGroupTypeSelector() {
    return (
      <div className="flex flex-col justify-center items-center py-6">
        <div className="flex flex-col sm:max-w-[425px]">
          <DialogHeader className="self-start text-left">
            <DialogTitle>{t("group.create.title")}</DialogTitle>
            <DialogDescription>
              {t("group.create.type.select")}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-6 mt-4">
            <div
              className="border rounded-lg p-4 hover:bg-muted/50 transition-colors cursor-pointer"
              onClick={() => setGroupType("nip29")}
            >
              <div className="flex flex-col items-center gap-3 mb-2">
                <span className="text-7xl">👪</span>
                <span className="text-xl font-medium">
                  {t("group.create.type.nip29")}
                </span>
              </div>
              <p className="text-muted-foreground text-center text-sm font-normal">
                {t("group.create.type.nip29_description")}
              </p>
            </div>

            <div
              className="border rounded-lg p-4 hover:bg-muted/50 transition-colors cursor-pointer"
              onClick={() => setGroupType("community")}
            >
              <div className="flex flex-col items-center gap-3 mb-2">
                <span className="text-7xl">🏰</span>
                <span className="text-xl font-medium">
                  {t("group.create.type.community")}
                </span>
              </div>
              <p className="text-muted-foreground text-center text-sm font-normal">
                {t("group.create.type.community_description")}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderNip29GroupForm() {
    return (
      <>
        <DialogHeader>
          <DialogTitle>{t("group.create.title")}</DialogTitle>
          <DialogDescription>{t("group.create.description")}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="flex flex-row gap-6 justify-between items-center">
              <FormField
                control={form.control}
                name="picture"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <UploadImage
                        onUpload={(blob) => field.onChange(blob.url)}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>{t("group.create.form.name.label")}</FormLabel>
                    <FormControl>
                      <Input
                        disabled={isLoading}
                        placeholder={t("group.create.form.name.placeholder")}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="about"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("group.create.form.about.label")}</FormLabel>
                  <FormControl>
                    <Textarea
                      disabled={isLoading}
                      className="resize-none"
                      placeholder={t("group.create.form.about.placeholder")}
                      minRows={2}
                      maxRows={6}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="relay"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1.5">
                    <Server className="h-3.5 w-3.5 text-muted-foreground" />
                    {t("group.create.form.relay.label")}
                  </FormLabel>
                  <FormControl>
                    <Select disabled={isLoading} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={t("group.create.form.relay.placeholder")}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {nip29Relays.map((relay) => (
                          <SelectItem key={relay} value={relay}>
                            <span className="font-mono">
                              {getRelayHost(relay)}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                  <FormDescription>
                    {t("group.create.form.relay.description")}
                  </FormDescription>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="visibility"
              render={({ field }) => (
                <FormItem>
                  <div className="flex flex-row justify-between items-center">
                    <FormLabel>
                      {t("group.create.form.visibility.label")}
                    </FormLabel>
                    <FormControl>
                      <Select
                        disabled={isLoading}
                        onValueChange={field.onChange}
                        defaultValue={"public"}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue placeholder="Choose visibility" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="public">
                            {t("group.create.form.visibility.anyone")}
                          </SelectItem>
                          <SelectItem value="private">
                            {t("group.create.form.visibility.members-only")}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                  </div>
                  <FormDescription>
                    {t("group.create.form.visibility.description")}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="access"
              render={({ field }) => (
                <FormItem>
                  <div className="flex flex-row justify-between items-center">
                    <FormLabel>{t("group.create.form.access.label")}</FormLabel>
                    <FormControl>
                      <Select
                        disabled={isLoading}
                        onValueChange={field.onChange}
                        defaultValue={"open"}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue placeholder="Choose policy" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">
                            {t("group.create.form.access.anyone")}
                          </SelectItem>
                          <SelectItem value="closed">
                            {t("group.create.form.access.invite-only")}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex flex-row justify-between items-center gap-4 mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setGroupType(null)}
                disabled={isLoading}
                className="h-10"
              >
                {t("back")}
              </Button>
              <Button
                disabled={
                  isLoading ||
                  !form.getValues("relay") ||
                  !isRelayURL(normalizeRelayUrl(form.getValues("relay")))
                }
                type="submit"
                className="h-10"
              >
                {t("group.create.form.submit.trigger")}
              </Button>
            </div>
          </form>
        </Form>
      </>
    );
  }

  function renderCommunityForm() {
    const watchBackupRelays = communityForm.watch("backupRelays");
    const watchBackupBlossomServers = communityForm.watch(
      "backupBlossomServers",
    );
    const primaryRelay = communityForm.watch("relay");
    const primaryBlossomServer = communityForm.watch("primaryBlossomServer");

    const addBackupRelay = () => {
      if (!backupRelayInput) return;

      const normalizedUrl = normalizeRelayUrl(backupRelayInput);

      // Check for duplicate with primary relay first
      if (normalizeRelayUrl(primaryRelay) === normalizedUrl) {
        toast.error(
          t(
            "group.create.community.form.backup_relays.error_duplicate_primary",
          ),
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
        communityForm.setValue("backupRelays", [
          ...watchBackupRelays,
          normalizedUrl,
        ]);
        setBackupRelayInput("");
      }
    };

    const removeBackupRelay = (relay: string) => {
      communityForm.setValue(
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
          t(
            "group.create.community.form.backup_blossom.error_duplicate_primary",
          ),
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
        communityForm.setValue("backupBlossomServers", [
          ...watchBackupBlossomServers,
          normalizedUrl,
        ]);
        setBackupBlossomInput("");
      }
    };

    const removeBackupBlossomServer = (server: string) => {
      communityForm.setValue(
        "backupBlossomServers",
        watchBackupBlossomServers.filter((s) => s !== server),
      );
    };

    const handleCommunitySubmit = async (
      values: z.infer<typeof communityFormSchema>,
    ) => {
      if (!userPubkey) {
        toast.error("User pubkey not found");
        return;
      }

      const normalizedValues = {
        ...values,
        pubkey: userPubkey,
        relay: normalizeRelayUrl(values.relay),
        backupRelays: values.backupRelays.map(normalizeRelayUrl),
        primaryBlossomServer: values.primaryBlossomServer
          ? normalizeServerUrl(values.primaryBlossomServer)
          : undefined,
        backupBlossomServers:
          values.backupBlossomServers.map(normalizeServerUrl),
      };

      try {
        const event = new NDKEvent(ndk, {
          kind: COMMUNIKEY,
          content: "",
          tags: [["r", normalizedValues.relay]],
        } as unknown as NostrEvent);
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
        await event.publish(relaySet);
        const id = userPubkey;
        const relay = normalizedValues.relay;
        const group = { id, relay };
        // todo: community URL
        navigate(`/${getRelayHost(relay)}/${id}`);
        setShowDialog(false);
        resetForm();
        bookmarkGroup(group);
      } catch (err) {
        console.error(err);
      }
      setShowDialog(false);
      resetForm();
    };

    return (
      <div className="space-y-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Castle className="h-7 w-7 text-muted-foreground" />
            {userPubkey && (
              <User
                pubkey={userPubkey}
                classNames={{ avatar: "size-7", name: "font-normal" }}
              />
            )}
          </DialogTitle>
          <DialogDescription>
            {t("group.create.community.description")}
          </DialogDescription>
        </DialogHeader>

        <Form {...communityForm}>
          <form
            onSubmit={communityForm.handleSubmit(handleCommunitySubmit)}
            className="space-y-6"
          >
            <FormField
              control={communityForm.control}
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
              onValueChange={(value) =>
                setIsBackupRelaysOpen(value === "item-1")
              }
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
              control={communityForm.control}
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
                    {t(
                      "group.create.community.form.primary_blossom.description",
                    )}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Accordion
              type="single"
              collapsible
              value={isBackupBlossomOpen ? "item-1" : ""}
              onValueChange={(value) =>
                setIsBackupBlossomOpen(value === "item-1")
              }
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
                    {t(
                      "group.create.community.form.backup_blossom.description",
                    )}
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
              control={communityForm.control}
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
              <Button
                type="button"
                variant="outline"
                onClick={() => setGroupType(null)}
                disabled={isLoading}
                className="h-10"
              >
                {t("back")}
              </Button>
              <Button
                disabled={
                  isLoading ||
                  !communityForm.getValues("relay") ||
                  !isRelayURL(
                    normalizeRelayUrl(communityForm.getValues("relay")),
                  )
                }
                type="submit"
                className="h-10"
              >
                {t("group.create.form.submit.trigger")}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    );
  }

  function renderDialogContent() {
    if (groupType === null) return renderGroupTypeSelector();
    if (groupType === "nip29") return renderNip29GroupForm();
    if (groupType === "community") return renderCommunityForm();
  }

  return canSign ? (
    <Dialog open={showDialog} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        {children || (
          <div className="p-2 w-full">
            <Button
              aria-label="New group"
              type="button"
              variant="outline"
              className="w-full"
              size="sm"
            >
              <Plus className="size-6" />
              <span className={className}>{t("group.create.new")}</span>
            </Button>
          </div>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        {renderDialogContent()}
      </DialogContent>
    </Dialog>
  ) : null;
}

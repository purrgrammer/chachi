import { useState, ReactNode } from "react";
import { useAtomValue } from "jotai";
import { toast } from "sonner";
import { z } from "zod";
import { NDKEvent, NDKKind } from "@nostr-dev-kit/ndk";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Plus, Castle, Server } from "lucide-react";
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
import { useRelays, useRelaySet } from "@/lib/nostr";
import { useCreateGroup, useEditGroup } from "@/lib/nostr/groups";
import { nip29Relays, getRelayHost, isRelayURL } from "@/lib/relay";
import {
  CommunityForm,
  createCommunityEvent,
  CommunityFormValues,
} from "@/components/nostr/groups/community-form";
import { useAccount, usePubkey } from "@/lib/account";
import { useMyGroups } from "@/lib/groups";
import { randomId } from "@/lib/id";
import { useNDK } from "@/lib/ndk";
import { useNavigate } from "@/lib/navigation";
import type { Group } from "@/lib/types";
import { useTranslation } from "react-i18next";
import { User } from "@/components/nostr/user";

function normalizeRelayUrl(url: string): string {
  if (!url) return "";
  return url.startsWith("wss://")
    ? url
    : `wss://${url.replace(/^(ws:\/\/|http:\/\/|https:\/\/)/, "")}`;
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

  async function bookmarkGroup(group: Group) {
    try {
      const newGroups = [...groups, group];
      const event = new NDKEvent(ndk, {
        kind: NDKKind.SimpleGroupList,
        content: groupsContent,
        tags: newGroups.map((g) => [
          "group",
          g.id,
          g.relay,
          ...(g.isCommunity ? ["community"] : []),
        ]),
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

  async function handleCommunitySubmit(values: CommunityFormValues) {
    if (!userPubkey) {
      toast.error("User pubkey not found");
      return;
    }

    try {
      setIsLoading(true);
      const event = createCommunityEvent(values, userPubkey);
      const ndkEvent = new NDKEvent(ndk, event);
      await ndkEvent.publish(relaySet);

      const id = userPubkey;
      const relay = normalizeRelayUrl(values.relay);
      const group = { id, relay };

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
                          <SelectValue
                            placeholder={t(
                              "group.create.form.visibility.placeholder",
                            )}
                          />
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
                          <SelectValue
                            placeholder={t(
                              "group.create.form.access.placeholder",
                            )}
                          />
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

        <CommunityForm
          onSubmit={handleCommunitySubmit}
          onCancel={() => setGroupType(null)}
          isLoading={isLoading}
          cancelLabel={t("back")}
        />
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

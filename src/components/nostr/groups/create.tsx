import { useState, ReactNode } from "react";
import { useAtomValue } from "jotai";
import { toast } from "sonner";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Plus, Castle, Server } from "lucide-react";
import {
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
  FormControl,
  FormDescription,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRelays } from "@/lib/nostr";
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
import { useNavigate } from "@/lib/navigation";
import type { Group } from "@/lib/types";
import { useTranslation } from "react-i18next";
import { User } from "@/components/nostr/user";
import { usePublishEvent, usePublishSimpleGroupList } from "@/lib/nostr/publishing";
import {
  Nip29GroupForm,
  useNip29Form,
  nip29FormDefaults,
  type Nip29FormValues,
} from "@/components/nostr/groups/nip29-group-form";

function normalizeRelayUrl(url: string): string {
  if (!url) return "";
  return url.startsWith("wss://")
    ? url
    : `wss://${url.replace(/^(ws:\/\/|http:\/\/|https:\/\/)/, "")}`;
}

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
  const [showDialog, setShowDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [groupType, setGroupType] = useState<GroupType>(null);
  const [useCustomRelay, setUseCustomRelay] = useState(false);
  const groups = useMyGroups();
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
  const publish = usePublishEvent();
  const publishGroupList = usePublishSimpleGroupList();

  const userRelayUrls = userRelaysData
    .filter((relay) => relay.url && isRelayURL(relay.url))
    .map((relay) => relay.url);

  // Nip29 form includes relay field separately via relayField state
  const [relayValue, setRelayValue] = useState(nip29Relays[0]);
  const form = useNip29Form();

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
      await publishGroupList(newGroups, userRelays);
    } catch (err) {
      console.error(err);
      toast.error(t("group.bookmark.error"));
    }
  }

  async function onSubmit(values: Nip29FormValues) {
    try {
      setIsLoading(true);
      const id = randomId();
      const relay = relayValue;
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
      await publish(event, userRelays);

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
    form.reset(nip29FormDefaults);
    setRelayValue(nip29Relays[0]);

    communityForm.reset({
      relay: userRelayUrls.length > 0 ? userRelayUrls[0] : "",
      backupRelays: userRelayUrls.slice(1),
      primaryBlossomServer: mediaServers.length > 0 ? mediaServers[0] : "",
      backupBlossomServers: mediaServers.slice(1),
      communityMint: userMints.length > 0 ? userMints[0] : "",
    });

    setGroupType(null);
    setUseCustomRelay(false);
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
        <Nip29GroupForm
          form={form}
          onSubmit={onSubmit}
          isLoading={isLoading}
          relayUrl={relayValue}
          relaySection={
            <FormItem>
              <FormLabel className="flex items-center gap-1.5">
                <Server className="h-3.5 w-3.5 text-muted-foreground" />
                {t("group.create.form.relay.label")}
              </FormLabel>
              <FormControl>
                {useCustomRelay ? (
                  <div className="space-y-2">
                    <Input
                      disabled={isLoading}
                      placeholder="wss://relay.example.com"
                      className="font-mono"
                      value={relayValue}
                      onChange={(e) => {
                        setRelayValue(normalizeRelayUrl(e.target.value));
                      }}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setUseCustomRelay(false);
                        setRelayValue(nip29Relays[0]);
                      }}
                      className="h-8"
                    >
                      {t("group.create.form.relay.use-predefined")}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Select disabled={isLoading} onValueChange={setRelayValue} value={relayValue}>
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
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setUseCustomRelay(true);
                        setRelayValue("");
                      }}
                      className="h-8"
                    >
                      {t("group.create.form.relay.use-custom")}
                    </Button>
                  </div>
                )}
              </FormControl>
              <FormMessage />
              <FormDescription>
                {t("group.create.form.relay.description")}
              </FormDescription>
            </FormItem>
          }
          footer={
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
                  !relayValue ||
                  !isRelayURL(normalizeRelayUrl(relayValue))
                }
                type="submit"
                className="h-10"
              >
                {t("group.create.form.submit.trigger")}
              </Button>
            </div>
          }
        />
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
      <DialogContent className="sm:max-w-[425px] max-h-[85dvh] overflow-y-auto">
        {renderDialogContent()}
      </DialogContent>
    </Dialog>
  ) : null;
}

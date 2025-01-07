import { useState, ReactNode } from "react";
import { useAtomValue } from "jotai";
import { toast } from "sonner";
import { z } from "zod";
import { NDKEvent, NDKKind } from "@nostr-dev-kit/ndk";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Plus } from "lucide-react";
import { NostrEvent } from "nostr-tools";
import { groupsContentAtom } from "@/app/store";
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
import { useAccount } from "@/lib/account";
import { useMyGroups } from "@/lib/groups";
import { randomId } from "@/lib/id";
import { useNDK } from "@/lib/ndk";
import { useNavigate } from "@/lib/navigation";
import type { Group } from "@/lib/types";
import { useTranslation } from "react-i18next";

const formSchema = z.object({
  name: z
    .string({
      // TODO add translation
      required_error: "Please add a name",
    })
    .min(1)
    .max(140),
  picture: z.string().url().optional(),
  about: z.string().min(0).max(500).optional(),
  visibility: z.enum(["public", "private"]).default("public"),
  access: z.enum(["open", "closed"]).default("open"),
  relay: z
    .string({
      // TODO add translation
      required_error: "Please select a relay",
    })
    .url(),
});

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
  const groups = useMyGroups();
  const groupsContent = useAtomValue(groupsContentAtom);
  const createGroup = useCreateGroup();
  const editGroup = useEditGroup();
  const account = useAccount();
  const canSign = account?.pubkey && !account.isReadOnly;
  const navigate = useNavigate();
  const userRelays = useRelays();
  const relaySet = useRelaySet(userRelays.filter((r) => isRelayURL(r)));

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

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
      relay: undefined,
    });
  }

  function onOpenChange(open: boolean) {
    if (!open) {
      resetForm();
    }
    setShowDialog(open);
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
                  <FormLabel>{t("group.create.form.relay.label")}</FormLabel>
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
            <div className="flex flex-row justify-end space-y-4 space-x-2">
              <Button disabled={isLoading} type="submit">
                {t("group.create.form.submit.trigger")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  ) : null;
}

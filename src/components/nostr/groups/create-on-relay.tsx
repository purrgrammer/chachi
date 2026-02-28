import { useState, ReactNode } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Plus, BookLock, PenOff, EyeOff, ShieldOff } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { useRelays } from "@/lib/nostr";
import { useCreateGroup, useEditGroup } from "@/lib/nostr/groups";
import { getRelayHost } from "@/lib/relay";
import { useAccount } from "@/lib/account";
import { useMyGroups } from "@/lib/groups";
import { randomId } from "@/lib/id";
import { useNavigate } from "@/lib/navigation";
import type { Group } from "@/lib/types";
import { useTranslation } from "react-i18next";
import { usePublishSimpleGroupList } from "@/lib/nostr/publishing";

const formSchema = z.object({
  name: z.string().min(1).max(140),
  picture: z.string().url().optional(),
  about: z.string().min(0).max(500).optional(),
  isPrivate: z.boolean().default(false),
  isRestricted: z.boolean().default(false),
  isHidden: z.boolean().default(false),
  isClosed: z.boolean().default(false),
});

/**
 * Component to create a new NIP-29 group on a specific relay
 * The relay is pre-selected and not editable
 */
export function CreateGroupOnRelay({
  relay,
  children,
  className,
}: {
  relay: string;
  children?: ReactNode;
  className?: string;
}) {
  const { t } = useTranslation();
  const [showDialog, setShowDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const groups = useMyGroups();
  const createGroup = useCreateGroup();
  const editGroup = useEditGroup();
  const account = useAccount();
  const canSign = account?.pubkey && !account.isReadOnly;
  const navigate = useNavigate();
  const userRelays = useRelays();
  const publishGroupList = usePublishSimpleGroupList();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      isPrivate: false,
      isRestricted: false,
      isHidden: false,
      isClosed: false,
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

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setIsLoading(true);
      const id = randomId();
      const group = await createGroup(id, relay);
      const metadata = { ...group, ...values, relay };
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
      isPrivate: false,
      isRestricted: false,
      isHidden: false,
      isClosed: false,
    });
  }

  function onOpenChange(open: boolean) {
    if (!open) resetForm();
    setShowDialog(open);
  }

  return canSign ? (
    <Dialog open={showDialog} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        {children || (
          <Button
            aria-label="New group"
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
          >
            <Plus className="size-4" />
            <span className={className}>{t("group.create.new")}</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t("group.create.title")}</DialogTitle>
          <DialogDescription>
            {t("group.create.description")}
          </DialogDescription>
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
            <FormItem>
              <FormLabel>{t("group.create.form.relay.label")}</FormLabel>
              <FormControl>
                <Input
                  disabled
                  value={getRelayHost(relay)}
                  className="font-mono bg-muted"
                />
              </FormControl>
              <FormDescription>
                {t("group.create.form.relay.description")}
              </FormDescription>
            </FormItem>
            {/* Group Access Settings */}
            <div className="space-y-3 pt-2">
              <h4 className="text-sm font-medium text-muted-foreground">
                {t("group.create.form.access-settings")}
              </h4>
              <FormField
                control={form.control}
                name="isPrivate"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-2">
                      <BookLock className="h-4 w-4 text-muted-foreground" />
                      <div className="space-y-0.5">
                        <FormLabel className="text-sm font-medium">
                          {t("group.create.form.private.label")}
                        </FormLabel>
                        <FormDescription className="text-xs">
                          {t("group.create.form.private.description")}
                        </FormDescription>
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isLoading}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isRestricted"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-2">
                      <PenOff className="h-4 w-4 text-muted-foreground" />
                      <div className="space-y-0.5">
                        <FormLabel className="text-sm font-medium">
                          {t("group.create.form.restricted.label")}
                        </FormLabel>
                        <FormDescription className="text-xs">
                          {t("group.create.form.restricted.description")}
                        </FormDescription>
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isLoading}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isHidden"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-2">
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                      <div className="space-y-0.5">
                        <FormLabel className="text-sm font-medium">
                          {t("group.create.form.hidden.label")}
                        </FormLabel>
                        <FormDescription className="text-xs">
                          {t("group.create.form.hidden.description")}
                        </FormDescription>
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isLoading}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isClosed"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-2">
                      <ShieldOff className="h-4 w-4 text-muted-foreground" />
                      <div className="space-y-0.5">
                        <FormLabel className="text-sm font-medium">
                          {t("group.create.form.closed.label")}
                        </FormLabel>
                        <FormDescription className="text-xs">
                          {t("group.create.form.closed.description")}
                        </FormDescription>
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isLoading}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            <div className="flex justify-end mt-6">
              <Button disabled={isLoading} type="submit" className="h-10">
                {t("group.create.form.submit.trigger")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  ) : null;
}

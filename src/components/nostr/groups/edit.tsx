import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { Settings, Trash, BookLock, PenOff, EyeOff, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { UploadImage } from "@/components/upload-image";
import { Switch } from "@/components/ui/switch";
import { useEditGroup } from "@/lib/nostr/groups";
import { useCanSign } from "@/lib/account";
import type { GroupMetadata } from "@/lib/types";
import { useBookmarkGroup } from "@/components/nostr/groups/bookmark";
import { saveGroupEvent } from "@/lib/messages";
import { DELETE_GROUP } from "@/lib/kinds";
import { useTranslation } from "react-i18next";
import { usePublishEvent } from "@/lib/nostr/publishing";

export function EditGroup({ group }: { group: GroupMetadata }) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const canSign = useCanSign();
  const editGroup = useEditGroup();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const formSchema = z.object({
    name: z
      .string({
        required_error: t("group.edit.form.name.required"),
      })
      .min(1)
      .max(140),
    picture: z.string().url().optional(),
    about: z.string().min(0).max(500).optional(),
    isPrivate: z.boolean().default(false),
    isRestricted: z.boolean().default(false),
    isHidden: z.boolean().default(false),
    isClosed: z.boolean().default(false),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: group,
    resetOptions: { keepDefaultValues: true },
  });
  const { isBookmarked, unbookmarkGroup } = useBookmarkGroup(group);
  const publish = usePublishEvent();

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setIsLoading(true);
      await editGroup({ ...group, ...values });
      toast.success(t("group.edit.form.submit.success"));
      setOpen(false);
    } catch (err) {
      console.error(err);
      toast.error(t("group.edit.form.submit.error"));
    } finally {
      setIsLoading(false);
    }
  }

  async function deleteGroup() {
    try {
      setIsLoading(true);
      toast.success(t("group.delete.success"));
      setOpen(false);
      const template = {
        kind: DELETE_GROUP,
        content: "",
        tags: [["h", group.id, group.relay]],
        created_at: Math.floor(Date.now() / 1000),
      };
      const publishedEvent = await publish(template, [group.relay]);
      if (isBookmarked) {
        unbookmarkGroup();
      }
      saveGroupEvent(publishedEvent, group);
      navigate("/");
    } catch (err) {
      console.error(err);
      toast.error(t("group.delete.error"));
    } finally {
      setIsLoading(false);
    }
  }

  return canSign ? (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button aria-label="Group settings" variant="ghost" size="icon">
          <Settings className="size-6" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t("group.edit.title")}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-2"
          >
            <div className="flex flex-row gap-6 justify-between items-center">
              <FormField
                control={form.control}
                name="picture"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="flex justify-center items-center w-full">
                        <UploadImage
                          defaultImage={field.value}
                          onUpload={(blob) => field.onChange(blob.url)}
                        />
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>{t("group.edit.form.name.label")}</FormLabel>
                    <FormControl>
                      <Input
                        disabled={isLoading}
                        placeholder={t("group.edit.form.name.placeholder")}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      {t("group.edit.form.name.description")}
                    </FormDescription>
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
                  <FormLabel>{t("group.edit.form.about.label")}</FormLabel>
                  <FormControl>
                    <Textarea
                      disabled={isLoading}
                      className="resize-none"
                      placeholder={t("group.edit.form.about.placeholder")}
                      minRows={2}
                      maxRows={6}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    {t("group.edit.form.about.description")}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
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
            <div className="flex flex-row justify-between mt-4">
              <AlertDialog>
                <AlertDialogTrigger>
                  <Button type="button" variant="destructive">
                    <Trash /> {t("group.delete.trigger")}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      {t("group.delete.confirmation.title")}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {t("group.delete.confirmation.description")}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={isLoading}>
                      {t("group.delete.confirmation.cancel")}
                    </AlertDialogCancel>
                    <AlertDialogAction
                      disabled={isLoading}
                      onClick={deleteGroup}
                    >
                      <Trash className="size-8" />{" "}
                      {t("group.delete.confirmation.confirm")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button type="submit">
                {t("group.edit.form.submit.trigger")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  ) : null;
}

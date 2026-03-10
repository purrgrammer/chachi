import { ReactNode } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, UseFormReturn } from "react-hook-form";
import { BookLock, PenOff, EyeOff, ShieldOff } from "lucide-react";
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
import {
  GroupTypeSelector,
  groupTypeFromFlags,
  flagsFromGroupType,
} from "@/components/nostr/groups/group-type-selector";
import { useTranslation } from "react-i18next";

export const nip29FormSchema = z.object({
  name: z.string().min(1).max(140),
  picture: z.string().url().optional(),
  about: z.string().min(0).max(500).optional(),
  isPrivate: z.boolean().default(false),
  isRestricted: z.boolean().default(false),
  isHidden: z.boolean().default(false),
  isClosed: z.boolean().default(false),
  isLivekit: z.boolean().default(false),
  isNoText: z.boolean().default(false),
});

export type Nip29FormValues = z.infer<typeof nip29FormSchema>;

export const nip29FormDefaults: Nip29FormValues = {
  name: "",
  picture: undefined,
  about: "",
  isPrivate: false,
  isRestricted: false,
  isHidden: false,
  isClosed: false,
  isLivekit: false,
  isNoText: false,
};

export function useNip29Form(defaults?: Partial<Nip29FormValues>) {
  return useForm<Nip29FormValues>({
    resolver: zodResolver(nip29FormSchema),
    defaultValues: { ...nip29FormDefaults, ...defaults },
  });
}

export function Nip29GroupForm({
  form,
  onSubmit,
  isLoading,
  relaySection,
  footer,
}: {
  form: UseFormReturn<Nip29FormValues>;
  onSubmit: (values: Nip29FormValues) => void;
  isLoading: boolean;
  relaySection?: ReactNode;
  footer: ReactNode;
}) {
  const { t } = useTranslation();

  return (
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
        {relaySection}
        {/* Access Settings */}
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
        <GroupTypeSelector
          value={groupTypeFromFlags(form.watch("isLivekit"), form.watch("isNoText"))}
          onChange={(type) => {
            const flags = flagsFromGroupType(type);
            form.setValue("isLivekit", flags.isLivekit);
            form.setValue("isNoText", flags.isNoText);
          }}
          disabled={isLoading}
        />
        {footer}
      </form>
    </Form>
  );
}

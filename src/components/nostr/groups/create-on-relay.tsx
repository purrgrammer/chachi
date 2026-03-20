import { useState, ReactNode } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
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
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
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
import {
  Nip29GroupForm,
  useNip29Form,
  nip29FormDefaults,
  type Nip29FormValues,
} from "@/components/nostr/groups/nip29-group-form";

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
  const form = useNip29Form();

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
      const group = await createGroup(id, relay);
      const metadata = { ...group, ...values, relay };
      await editGroup(metadata);
      toast.success(t("group.create.form.submit.success"));
      navigate(`/${getRelayHost(relay)}/${id}`);
      setShowDialog(false);
      form.reset(nip29FormDefaults);
      bookmarkGroup(group);
    } catch (err) {
      console.error(err);
      toast.error(t("group.create.form.submit.error"));
    } finally {
      setIsLoading(false);
    }
  }

  function onOpenChange(open: boolean) {
    if (!open) form.reset(nip29FormDefaults);
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
      <DialogContent className="sm:max-w-[425px] max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("group.create.title")}</DialogTitle>
          <DialogDescription>
            {t("group.create.description")}
          </DialogDescription>
        </DialogHeader>
        <Nip29GroupForm
          form={form}
          onSubmit={onSubmit}
          isLoading={isLoading}
          relayUrl={relay}
          relaySection={
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
          }
          footer={
            <div className="flex justify-end mt-6">
              <Button disabled={isLoading} type="submit" className="h-10">
                {t("group.create.form.submit.trigger")}
              </Button>
            </div>
          }
        />
      </DialogContent>
    </Dialog>
  ) : null;
}

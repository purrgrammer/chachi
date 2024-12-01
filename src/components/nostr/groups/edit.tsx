import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { NostrEvent } from "nostr-tools";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { Settings, Trash } from "lucide-react";
import { NDKEvent } from "@nostr-dev-kit/ndk";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRelaySet } from "@/lib/nostr";
import { useEditGroup } from "@/lib/nostr/groups";
import { useCanSign } from "@/lib/account";
import type { GroupMetadata } from "@/lib/types";
import { useNDK } from "@/lib/ndk";
import { useBookmarkGroup } from "@/components/nostr/groups/bookmark";
import { saveGroupEvent } from "@/lib/messages";
import { DELETE_GROUP } from "@/lib/kinds";

const formSchema = z.object({
  name: z
    .string({
      required_error: "Please add a name",
    })
    .min(1)
    .max(140),
  picture: z.string().url().optional(),
  about: z.string().min(0).max(500).optional(),
  visibility: z.enum(["public", "private"]),
  access: z.enum(["open", "closed"]),
});

export function EditGroup({ group }: { group: GroupMetadata }) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const canSign = useCanSign();
  const editGroup = useEditGroup();
  const navigate = useNavigate();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: group,
    resetOptions: { keepDefaultValues: true },
  });
  const { isBookmarked, unbookmarkGroup } = useBookmarkGroup(group);
  const relaySet = useRelaySet([group.relay]);
  const ndk = useNDK();

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setIsLoading(true);
      await editGroup({ ...group, ...values });
      toast.success("Group updated");
      setOpen(false);
    } catch (err) {
      console.error(err);
      toast.error("Couldn't update group");
    } finally {
      setIsLoading(false);
    }
  }

  async function deleteGroup() {
    try {
      setIsLoading(true);
      toast.success("Group deleted");
      setOpen(false);
      const ev = new NDKEvent(ndk, {
        kind: DELETE_GROUP,
        content: "",
        tags: [["h", group.id, group.relay]],
      } as NostrEvent);
      await ev.publish(relaySet);
      if (isBookmarked) {
        unbookmarkGroup();
      }
      saveGroupEvent(ev.rawEvent() as NostrEvent, group);
      navigate("/");
    } catch (err) {
      console.error(err);
      toast.error("Couldn't delete group");
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
          <DialogTitle>Group settings</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-2"
          >
            <div className="flex flex-row items-center justify-between gap-6">
              <FormField
                control={form.control}
                name="picture"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="w-full flex items-center justify-center">
                        <UploadImage
                          defaultImage={field.value}
                          onUpload={field.onChange}
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
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input
                        disabled={isLoading}
                        placeholder="My group"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>This is the group's name.</FormDescription>
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
                  <FormLabel>About</FormLabel>
                  <FormControl>
                    <Textarea
                      disabled={isLoading}
                      className="resize-none"
                      placeholder="A group for my frens"
                      minRows={2}
                      maxRows={6}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    This is the group's description.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="visibility"
              render={({ field }) => (
                <FormItem>
                  <div className="flex flex-row items-center justify-between">
                    <FormLabel>Visibility</FormLabel>
                    <FormControl>
                      <Select
                        disabled={isLoading}
                        onValueChange={field.onChange}
                        defaultValue={group.visibility}
                      >
                        <SelectTrigger className="w-64">
                          <SelectValue placeholder="Choose visibility" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="public">Anyone</SelectItem>
                          <SelectItem value="private">Members only</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                  </div>
                  <FormDescription>
                    Messages are not encrypted and can be read by relays. For
                    maximum privacy host your own relay.
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
                  <div className="flex flex-row items-center justify-between">
                    <FormLabel>Access</FormLabel>
                    <FormControl>
                      <Select
                        disabled={isLoading}
                        onValueChange={field.onChange}
                        defaultValue={group.access}
                      >
                        <SelectTrigger className="w-64">
                          <SelectValue placeholder="Choose policy" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">Anyone</SelectItem>
                          <SelectItem value="closed">Invite only</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                  </div>
                  <FormDescription>
                    Anyone can join an open group, closed groups require
                    approval.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex flex-row justify-between mt-4">
              <AlertDialog>
                <AlertDialogTrigger>
                  <Button type="button" variant="destructive">
                    <Trash /> Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Are you sure you want to delete the group?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. The group and all its
                      history will be deleted.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={isLoading}>
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      disabled={isLoading}
                      onClick={deleteGroup}
                    >
                      <Trash className="size-8" /> Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button type="submit">Save</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  ) : null;
}

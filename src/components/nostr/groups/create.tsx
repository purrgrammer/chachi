import { useState, ReactNode } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
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
import { useCreateGroup, useEditGroup } from "@/lib/nostr/groups";
import { nip29Relays, getRelayHost } from "@/lib/relay";
import { useAccount } from "@/lib/account";
import { randomId } from "@/lib/id";
import { useNavigate } from "@/lib/navigation";

const formSchema = z.object({
  name: z
    .string({
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
  const [isLoading, setIsLoading] = useState(false);
  const createGroup = useCreateGroup();
  const editGroup = useEditGroup();
  const account = useAccount();
  const canSign = account?.pubkey && !account.isReadOnly;
  const navigate = useNavigate();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setIsLoading(true);
      const id = randomId();
      const relay = values.relay;
      const group = await createGroup(id, relay);
      const metadata = { ...group, ...values };
      await editGroup(metadata);
      toast.success("Group created");
      navigate(`/${getRelayHost(relay)}/${id}`);
      // todo: close dialog
    } catch (err) {
      console.error(err);
      toast.error("Couldn't create group");
    } finally {
      setIsLoading(false);
    }
  }

  return canSign ? (
    <Dialog>
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
              <span className={className}>New group</span>
            </Button>
          </div>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create group</DialogTitle>
          <DialogDescription>
            Create a new group to chat with your friends.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="flex flex-row items-center justify-between gap-6">
              <FormField
                control={form.control}
                name="picture"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <UploadImage onUpload={field.onChange} />
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
                        placeholder="This is the group's name"
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
                  <FormLabel>About</FormLabel>
                  <FormControl>
                    <Textarea
                      disabled={isLoading}
                      className="resize-none"
                      placeholder="This is the group's description."
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
                  <FormLabel>Relay</FormLabel>
                  <FormControl>
                    <Select disabled={isLoading} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a relay" />
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
                    This is the server where the posts will be stored.
                  </FormDescription>
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
                        defaultValue={"public"}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue placeholder="Choose visibility" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="public">Public</SelectItem>
                          <SelectItem value="private">Private</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                  </div>
                  <FormDescription>
                    Public groups can be read by anyone, private groups require
                    authentication.
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
                        defaultValue={"open"}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue placeholder="Choose policy" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">Open</SelectItem>
                          <SelectItem value="closed">Closed</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                  </div>
                  <FormDescription>
                    Anyone can join an open group, closed groups require
                    approval or an invitation.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex flex-row justify-end space-y-4 space-x-2">
              <Button type="submit">Create</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  ) : null;
}

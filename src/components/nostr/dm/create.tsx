import { useState, ReactNode, useEffect } from "react";
import { User } from "@/components/nostr/user";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { useCanSign, useFollows, usePubkey } from "@/lib/account";
//import { useNDK } from "@/lib/ndk";
import { useNavigate } from "@/lib/navigation";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { useProfileSearch } from "@/lib/hooks/useProfileSearch";
import { Highlight } from "@/components/highlight";
import { Avatar } from "@/components/nostr/avatar";
import type { Profile } from "@/lib/types";

const formSchema = z.object({
  pubkeys: z.array(z.string()).min(1),
});

// Component for displaying multiple avatars in a circle
function GroupAvatar({ pubkeys }: { pubkeys: string[] }) {
  // If there's only one pubkey, just show a normal avatar
  if (pubkeys.length === 1) {
    return <Avatar pubkey={pubkeys[0]} className="size-10" />;
  }

  // Limit to max 5 avatars to prevent overcrowding
  const displayPubkeys = pubkeys.slice(0, 5);
  const totalAvatars = displayPubkeys.length;

  // Calculate size based on number of avatars
  const avatarSize = totalAvatars <= 3 ? "size-4" : "size-3";

  return (
    <div className="size-10 relative rounded-full bg-muted flex items-center justify-center">
      {displayPubkeys.map((pubkey, index) => {
        // Calculate positions for specific numbers of avatars
        let positionClass = "absolute ring-1 ring-background ";

        // Add size class
        positionClass += avatarSize + " ";

        // Handle common group sizes with specific positioning
        if (totalAvatars === 2) {
          positionClass += index === 0 ? "-translate-x-1.5" : "translate-x-1.5";
        } else if (totalAvatars === 3) {
          if (index === 0) positionClass += "-translate-y-2";
          else if (index === 1) positionClass += "-translate-x-2 translate-y-1";
          else positionClass += "translate-x-2 translate-y-1";
        } else if (totalAvatars === 4) {
          if (index === 0) positionClass += "-translate-x-2 -translate-y-2";
          else if (index === 1) positionClass += "translate-x-2 -translate-y-2";
          else if (index === 2) positionClass += "-translate-x-2 translate-y-2";
          else positionClass += "translate-x-2 translate-y-2";
        } else {
          // For 5 or more, use a simple circular layout with specific positions
          if (index === 0) positionClass += "translate-y-[-2.5rem]";
          else if (index === 1)
            positionClass += "translate-x-[2.4rem] translate-y-[-0.8rem]";
          else if (index === 2)
            positionClass += "translate-x-[1.5rem] translate-y-[2rem]";
          else if (index === 3)
            positionClass += "translate-x-[-1.5rem] translate-y-[2rem]";
          else positionClass += "translate-x-[-2.4rem] translate-y-[-0.8rem]";
        }

        return (
          <Avatar key={pubkey} pubkey={pubkey} className={positionClass} />
        );
      })}
    </div>
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
  //const ndk = useNDK();
  const [showDialog, setShowDialog] = useState(false);
  const follows = useFollows();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPubkeys, setSelectedPubkeys] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const me = usePubkey();
  const canSign = useCanSign();
  const navigate = useNavigate();

  const filteredProfiles = useProfileSearch(follows, searchQuery);

  const availableProfiles = filteredProfiles.filter(
    (profile) => !selectedPubkeys.includes(profile.pubkey),
  );

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      pubkeys: [],
    },
  });

  // Update form values when selected pubkeys change
  useEffect(() => {
    form.setValue("pubkeys", selectedPubkeys);
  }, [selectedPubkeys, form]);

  function addParticipant(profile: Profile) {
    if (!selectedPubkeys.includes(profile.pubkey)) {
      setSelectedPubkeys([...selectedPubkeys, profile.pubkey]);
    }
    setSearchQuery("");
  }

  function removeParticipant(pubkey: string) {
    setSelectedPubkeys(selectedPubkeys.filter((p) => p !== pubkey));
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      const groupId = [...values.pubkeys, me].join("");
      navigate(`/dm/${groupId}`);
      setShowDialog(false);
      resetForm();
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  function resetForm() {
    form.reset({
      pubkeys: [],
    });
    setSelectedPubkeys([]);
    setSearchQuery("");
  }

  function onOpenChange(open: boolean) {
    if (!open) {
      resetForm();
    }
    setShowDialog(open);
  }

  function getDisplayName(profile: Profile): string {
    return profile.name || profile.display_name || profile.pubkey.slice(0, 6);
  }

  const isSubmitDisabled = selectedPubkeys.length === 0;

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
              <span className={className}>{t("private-group.create.new")}</span>
            </Button>
          </div>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t("private-group.create.title")}</DialogTitle>
          <DialogDescription>
            {t("private-group.create.description")}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <Input
                  placeholder={t("private-group.create.search-follows")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1"
                />
              </div>
              {/* Available profiles list */}
              {searchQuery.trim() !== "" && availableProfiles.length > 0 && (
                <div className="max-h-[200px] overflow-y-auto flex flex-col gap-0.5">
                  {availableProfiles
                    .filter((p) => p.pubkey !== me)
                    .slice(0, 3)
                    .map((profile) => (
                      <div
                        key={profile.pubkey}
                        className="flex items-center justify-between rounded-lg border cursor-pointer hover:bg-accent p-1 px-2"
                        onClick={() => addParticipant(profile)}
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <User
                            pubkey={profile.pubkey}
                            notClickable
                            classNames={{ avatar: "size-6", name: "hidden" }}
                          />
                          <span className="font-medium truncate">
                            <Highlight
                              text={getDisplayName(profile)}
                              highlight={searchQuery}
                            />
                          </span>
                        </div>
                        <Button variant="ghost" size="smallIcon" type="button">
                          <Plus className="size-4" />
                        </Button>
                      </div>
                    ))}
                </div>
              )}

              {/* Selected participants */}
              <div className="flex flex-col gap-1 mt-4">
                <h3 className="text-sm font-medium">
                  {t("private-group.create.group-members")}
                </h3>

                {selectedPubkeys.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    {t("private-group.create.add-some-participants")}
                  </p>
                )}

                {/* Show message when no matches */}
                {searchQuery && availableProfiles.length === 0 && (
                  <div className="text-center text-xs text-muted-foreground">
                    {t("private-group.create.no-matches")}
                  </div>
                )}
              </div>
            </div>

            {/* Group preview when there are selected pubkeys */}
            {selectedPubkeys.length > 0 && (
              <div className="flex items-center gap-3 p-3 border rounded-lg mb-4 bg-muted/30">
                {selectedPubkeys.length === 1 ? (
                  <Avatar pubkey={selectedPubkeys[0]} className="size-12" />
                ) : (
                  <div className="size-12">
                    <GroupAvatar pubkeys={selectedPubkeys} />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium">
                    {selectedPubkeys.length === 1
                      ? t("private-group.create.private-message")
                      : t("private-group.create.group-chat")}
                  </p>
                  <p className="text-sm text-muted-foreground truncate">
                    {t("private-group.create.participants", {
                      n: selectedPubkeys.length,
                      count: selectedPubkeys.length
                    })}
                  </p>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-1 mt-1">
              {/* List of selected participants with remove option */}
              {selectedPubkeys.map((pubkey) => (
                <div
                  key={pubkey}
                  className="flex items-center justify-between rounded-lg border pl-3 p-1"
                >
                  <User
                  notClickable
                    pubkey={pubkey}
                    classNames={{ avatar: "size-6" }}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeParticipant(pubkey)}
                    type="button"
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitDisabled || isLoading}>
                {t("private-group.create.form.submit.trigger")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  ) : null;
}

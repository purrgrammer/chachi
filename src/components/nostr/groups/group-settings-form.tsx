import React, { useState, useEffect } from "react";
import {
  Info,
  Shield,
  Users,
  UserRoundPlus,
  ImagePlus,
  RotateCw,
  Plus,
  X,
  Search,
  UserCheck,
  Ticket,
  Copy,
  Trash2,
  Link,
  BookLock,
  PenOff,
  EyeOff,
  ShieldOff,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TabContainer, TabItem } from "@/components/ui/tab-container";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { InputCopy } from "@/components/ui/input-copy";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar } from "@/components/nostr/avatar";
import { Name } from "@/components/nostr/name";
import { usePubkey, useCanSign } from "@/lib/account";
import { dedupeBy } from "@/lib/utils";
import {
  useGroupParticipants,
  useJoinRequests,
  useAddUser,
  useDeleteEvent,
  useAddAdmin,
  useRemoveAdmin,
  useEditGroup,
  useCreateInviteCode,
  useGroupInviteCodes,
  useRevokeInviteCode,
} from "@/lib/nostr/groups";
import { saveGroupEvent } from "@/lib/messages";
import { useUpload } from "@/lib/media";
import {
  useProfileAutocomplete,
  getProfileDisplayName,
} from "@/lib/hooks/useProfileAutocomplete";
import type { Group, GroupMetadata, GroupInviteCode } from "@/lib/types";
import { getRelayHost } from "@/lib/relay";

export function GroupEditor({
  group,
  metadata,
}: {
  group: Group;
  metadata: GroupMetadata;
}) {
  const { t } = useTranslation();

  // Information tab states
  const [name, setName] = useState(metadata?.name || "");
  const [about, setAbout] = useState(metadata?.about || "");
  const [picture, setPicture] = useState(metadata?.picture || "");
  const [isInfoLoading, setIsInfoLoading] = useState(false);

  // Privacy tab states
  const [isPrivate, setIsPrivate] = useState(metadata?.isPrivate || false);
  const [isRestricted, setIsRestricted] = useState(
    metadata?.isRestricted || false,
  );
  const [isHidden, setIsHidden] = useState(metadata?.isHidden || false);
  const [isClosed, setIsClosed] = useState(metadata?.isClosed || false);
  const [isPrivacyLoading, setIsPrivacyLoading] = useState(false);

  // Members tab states
  const [accepted, setAccepted] = useState<string[]>([]);
  const [rejected, setRejected] = useState<string[]>([]);
  const { events: joinRequestEvents } = useJoinRequests(group);
  const { admins, members } = useGroupParticipants(group);
  const userPubkey = usePubkey();
  const canSign = useCanSign();
  const isAdmin = userPubkey && admins.includes(userPubkey);
  const addUser = useAddUser(group);
  const deleteEvent = useDeleteEvent(group);

  const joinRequests = dedupeBy(joinRequestEvents, "pubkey").filter(
    (p) =>
      !accepted.includes(p.pubkey) &&
      !rejected.includes(p.pubkey) &&
      !members.includes(p.pubkey),
  );

  const nonAdminMembers = members?.filter((m) => !admins.includes(m)) ?? [];

  // Admin management
  const addAdmin = useAddAdmin(group);
  const removeAdmin = useRemoveAdmin(group);
  const editGroup = useEditGroup();
  const allGroupMembers = [...admins, ...members];

  // Invite codes management
  const createInviteCode = useCreateInviteCode(group);
  const revokeInviteCode = useRevokeInviteCode(group);
  const { data: inviteCodes } = useGroupInviteCodes(group);
  const [isCreatingCode, setIsCreatingCode] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedExpiration, setSelectedExpiration] = useState<string>("never");
  const [createdInviteCode, setCreatedInviteCode] = useState<string | null>(
    null,
  );

  // Profile autocomplete for adding admins
  const {
    searchQuery: adminSearchQuery,
    setSearchQuery: setAdminSearchQuery,
    availableProfiles: availableMembers,
    selectedProfiles: selectedNewAdmins,
    addProfile: addNewAdmin,
    removeProfile: removeNewAdmin,
    clearSelection: clearNewAdmins,
  } = useProfileAutocomplete({
    pubkeys: allGroupMembers,
    excludePubkeys: admins, // Exclude current admins
    excludeCurrentUser: false,
  });

  // Image upload states
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const { upload, canSign: canUpload } = useUpload();

  // Update form state when metadata prop changes
  useEffect(() => {
    if (metadata) {
      setName(metadata.name || "");
      setAbout(metadata.about || "");
      setPicture(metadata.picture || "");
      setIsPrivate(metadata.isPrivate || false);
      setIsRestricted(metadata.isRestricted || false);
      setIsHidden(metadata.isHidden || false);
      setIsClosed(metadata.isClosed || false);
    }
  }, [metadata]);

  // Reset join request states when group changes
  useEffect(() => {
    setAccepted([]);
    setRejected([]);
  }, [group]);

  async function handleSaveInformation() {
    try {
      setIsInfoLoading(true);

      const updatedMetadata = {
        ...metadata,
        id: group.id,
        relay: group.relay,
        name,
        about,
        picture,
        isPrivate,
        isRestricted,
        isHidden,
        isClosed,
      };

      await editGroup(updatedMetadata);
      toast.success(
        t(
          "group.settings.information.success",
          "Group information updated successfully",
        ),
      );
    } catch (err) {
      console.error("Error saving group information:", err);
      toast.error(
        t(
          "group.settings.information.error",
          "Failed to update group information",
        ),
      );
    } finally {
      setIsInfoLoading(false);
    }
  }

  async function handleSavePrivacy() {
    try {
      setIsPrivacyLoading(true);

      const updatedMetadata = {
        ...metadata,
        id: group.id,
        relay: group.relay,
        name,
        about,
        picture,
        isPrivate,
        isRestricted,
        isHidden,
        isClosed,
      };

      await editGroup(updatedMetadata);
      toast.success(
        t(
          "group.settings.privacy.success",
          "Group privacy settings updated successfully",
        ),
      );
    } catch (err) {
      console.error("Error saving group privacy settings:", err);
      toast.error(
        t(
          "group.settings.privacy.error",
          "Failed to update group privacy settings",
        ),
      );
    } finally {
      setIsPrivacyLoading(false);
    }
  }

  async function acceptJoinRequest(pubkey: string) {
    try {
      const ev = await addUser(pubkey);
      setAccepted([...accepted, pubkey]);
      saveGroupEvent(ev, group);
      toast.success(t("join.request.accept.success", "User added to group"));
    } catch (err) {
      console.error(err);
      toast.error(t("join.request.accept.error", "Couldn't add user to group"));
    }
  }

  async function rejectJoinRequest(pubkey: string) {
    try {
      const userJoinEvents = joinRequestEvents.filter(
        (e) => e.pubkey === pubkey,
      );
      await Promise.all(userJoinEvents.map(deleteEvent));
      setRejected([...rejected, pubkey]);
      toast.success(
        t("join.request.reject.success", "User join request rejected"),
      );
    } catch (err) {
      console.error(err);
      toast.error(
        t("join.request.reject.error", "Couldn't reject user from group"),
      );
    }
  }

  async function handleImageUpload(file: File) {
    try {
      setIsUploadingImage(true);
      const blob = await upload(file);
      setPicture(blob.url);
      toast.success(
        t(
          "group.settings.information.image_uploaded",
          "Image uploaded successfully",
        ),
      );
    } catch (err) {
      console.error(err);
      toast.error(
        t(
          "group.settings.information.image_upload_error",
          "Failed to upload image",
        ),
      );
    } finally {
      setIsUploadingImage(false);
    }
  }

  function handleImageUrlChange(url: string) {
    setPicture(url);
  }

  async function handleRemoveAdmin(pubkey: string) {
    try {
      await removeAdmin(pubkey);
      toast.success(
        t("group.settings.admins.remove.success", "Admin removed successfully"),
      );
    } catch (err) {
      console.error(err);
      toast.error(
        t("group.settings.admins.remove.error", "Failed to remove admin"),
      );
    }
  }

  async function handleBatchAddAdmins() {
    try {
      await Promise.all(
        selectedNewAdmins.map((profile) => addAdmin(profile.pubkey, "admin")),
      );
      clearNewAdmins();
      setAdminSearchQuery("");
      toast.success(
        t(
          "group.settings.admins.batch_add.success",
          "Admins added successfully",
        ),
      );
    } catch (err) {
      console.error(err);
      toast.error(
        t("group.settings.admins.batch_add.error", "Failed to add some admins"),
      );
    }
  }

  function getExpirationTimestamp(duration: string): number | undefined {
    const now = Math.floor(Date.now() / 1000);
    switch (duration) {
      case "1week":
        return now + 7 * 24 * 60 * 60;
      case "1month":
        return now + 30 * 24 * 60 * 60;
      case "1year":
        return now + 365 * 24 * 60 * 60;
      case "never":
      default:
        return undefined;
    }
  }

  async function handleCreateInviteCode() {
    try {
      setIsCreatingCode(true);
      const expiresAt = getExpirationTimestamp(selectedExpiration);
      const code = await createInviteCode(expiresAt);
      setCreatedInviteCode(code);
      toast.success(
        t(
          "group.settings.invite_codes.create.success",
          "Invite code created successfully",
        ),
      );
    } catch (err) {
      console.error(err);
      toast.error(
        t(
          "group.settings.invite_codes.create.error",
          "Failed to create invite code",
        ),
      );
    } finally {
      setIsCreatingCode(false);
    }
  }

  async function handleRevokeInviteCode(code: string) {
    try {
      await revokeInviteCode(code);
      toast.success(
        t(
          "group.settings.invite_codes.revoke.success",
          "Invite code revoked successfully",
        ),
      );
    } catch (err) {
      console.error(err);
      toast.error(
        t(
          "group.settings.invite_codes.revoke.error",
          "Failed to revoke invite code",
        ),
      );
    }
  }

  function generateInviteUrl(code: string): string {
    const baseUrl = window.location.origin;
    const relayHost = getRelayHost(group.relay);
    return `${baseUrl}/join/${code}/${relayHost}/${group.id}`;
  }

  async function handleCopyInviteCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      toast.success(
        t(
          "group.settings.invite_codes.copy.success",
          "Invite code copied to clipboard",
        ),
      );
    } catch (err) {
      console.error(err);
      toast.error(
        t(
          "group.settings.invite_codes.copy.error",
          "Failed to copy invite code",
        ),
      );
    }
  }

  async function handleCopyInviteUrl(code: string) {
    try {
      const inviteUrl = generateInviteUrl(code);
      await navigator.clipboard.writeText(inviteUrl);
      toast.success(
        t(
          "group.settings.invite_codes.copy_url.success",
          "Invite URL copied to clipboard",
        ),
      );
    } catch (err) {
      console.error(err);
      toast.error(
        t(
          "group.settings.invite_codes.copy_url.error",
          "Failed to copy invite URL",
        ),
      );
    }
  }

  function handleCloseDialog(openOrEvent?: boolean | React.MouseEvent) {
    const open = typeof openOrEvent === "boolean" ? openOrEvent : false;
    setIsDialogOpen(open);
    if (!open) {
      setSelectedExpiration("never");
      setCreatedInviteCode(null);
    }
  }

  function GroupImageUpload() {
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleImageUpload(file);
      }
    };

    const handleUploadClick = () => {
      fileInputRef.current?.click();
    };

    return (
      <div className="space-y-3">
        <Label className="text-sm font-medium">
          {t("group.settings.information.picture", "Group Image")} (
          {t("group.settings.optional", "Optional")})
        </Label>

        <div className="flex flex-col gap-3">
          {/* Clickable Image Preview */}
          <div className="flex items-start gap-4">
            <button
              type="button"
              onClick={handleUploadClick}
              disabled={!canUpload || isUploadingImage}
              className="flex items-center justify-center w-20 h-20 rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50 transition-colors bg-muted/20 hover:bg-muted/40 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {picture ? (
                <img
                  src={picture}
                  alt="Group image preview"
                  className="w-full h-full object-cover rounded-lg"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : isUploadingImage ? (
                <RotateCw className="w-6 h-6 animate-spin text-muted-foreground" />
              ) : (
                <ImagePlus className="w-6 h-6 text-muted-foreground" />
              )}
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* URL Input */}
          <div>
            <Label
              htmlFor="group-picture-url"
              className="text-xs text-muted-foreground"
            >
              {t(
                "group.settings.information.or_enter_url",
                "Or enter image URL",
              )}
            </Label>
            <Input
              id="group-picture-url"
              value={picture}
              onChange={(e) => handleImageUrlChange(e.target.value)}
              placeholder={t(
                "group.settings.information.picture_placeholder",
                "https://example.com/image.jpg",
              )}
              className="mt-1"
            />
          </div>
        </div>
      </div>
    );
  }

  const tabs: TabItem[] = [
    {
      id: "information",
      name: t("group.settings.information.tab", "Information"),
      icon: <Info className="h-4 w-4" />,
      children: (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4">
            <GroupImageUpload />

            <div>
              <Label htmlFor="group-name" className="text-sm font-medium">
                {t("group.settings.information.name", "Group Name")}
              </Label>
              <Input
                id="group-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t(
                  "group.settings.information.name_placeholder",
                  "Enter group name",
                )}
                className="mt-1"
                required
              />
            </div>

            <div>
              <Label htmlFor="group-about" className="text-sm font-medium">
                {t("group.settings.information.about", "About")} (
                {t("group.settings.optional", "Optional")})
              </Label>
              <Textarea
                id="group-about"
                value={about}
                onChange={(e) => setAbout(e.target.value)}
                placeholder={t(
                  "group.settings.information.about_placeholder",
                  "Describe what this group is about...",
                )}
                className="min-h-[100px] mt-1"
              />
            </div>
          </div>

          <Button
            className="w-full"
            onClick={handleSaveInformation}
            disabled={isInfoLoading || !name.trim()}
          >
            {isInfoLoading
              ? t("group.settings.information.saving", "Saving...")
              : t("group.settings.information.save", "Save Information")}
          </Button>
        </div>
      ),
    },
    {
      id: "privacy",
      name: t("group.settings.privacy.tab", "Privacy"),
      icon: <Shield className="h-4 w-4" />,
      children: (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-6">
            <div className="space-y-3">
              {/* Private - Read permission */}
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <BookLock className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <Label htmlFor="is-private" className="font-medium">
                      {t("group.settings.privacy.private", "Private")}
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {t(
                        "group.settings.privacy.private_description",
                        "Only members can read group messages",
                      )}
                    </p>
                  </div>
                </div>
                <Switch
                  id="is-private"
                  checked={isPrivate}
                  onCheckedChange={setIsPrivate}
                />
              </div>

              {/* Restricted - Write permission */}
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <PenOff className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <Label htmlFor="is-restricted" className="font-medium">
                      {t("group.settings.privacy.restricted", "Restricted")}
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {t(
                        "group.settings.privacy.restricted_description",
                        "Only members can send messages to the group",
                      )}
                    </p>
                  </div>
                </div>
                <Switch
                  id="is-restricted"
                  checked={isRestricted}
                  onCheckedChange={setIsRestricted}
                />
              </div>

              {/* Hidden - Metadata visibility */}
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <Label htmlFor="is-hidden" className="font-medium">
                      {t("group.settings.privacy.hidden", "Hidden")}
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {t(
                        "group.settings.privacy.hidden_description",
                        "Relay hides group metadata from non-members",
                      )}
                    </p>
                  </div>
                </div>
                <Switch
                  id="is-hidden"
                  checked={isHidden}
                  onCheckedChange={setIsHidden}
                />
              </div>

              {/* Closed - Join requests */}
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <ShieldOff className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <Label htmlFor="is-closed" className="font-medium">
                      {t("group.settings.privacy.closed", "Closed")}
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {t(
                        "group.settings.privacy.closed_description",
                        "Join requests are ignored (invite-only)",
                      )}
                    </p>
                  </div>
                </div>
                <Switch
                  id="is-closed"
                  checked={isClosed}
                  onCheckedChange={setIsClosed}
                />
              </div>
            </div>
          </div>

          <Button
            className="w-full"
            onClick={handleSavePrivacy}
            disabled={isPrivacyLoading}
          >
            {isPrivacyLoading
              ? t("group.settings.privacy.saving", "Saving...")
              : t("group.settings.privacy.save", "Save Privacy Settings")}
          </Button>
        </div>
      ),
    },
    {
      id: "members",
      name: t("group.settings.members.tab", "Members"),
      icon: <Users className="h-4 w-4" />,
      children: (
        <div className="flex flex-col gap-4">
          {/* Join Requests Section - Only show for closed groups */}
          {isClosed && isAdmin && canSign && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <UserRoundPlus className="h-5 w-5" />
                <h3 className="text-sm font-medium">
                  {t("group.settings.members.join_requests", "Join Requests")} (
                  {joinRequests.length})
                </h3>
              </div>

              {joinRequests.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  {t(
                    "group.settings.members.no_requests",
                    "No pending join requests",
                  )}
                </p>
              ) : (
                <ScrollArea className="max-h-[200px]">
                  <div className="space-y-2">
                    {joinRequests.map((event) => (
                      <div
                        key={event.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar pubkey={event.pubkey} className="size-8" />
                          <Name pubkey={event.pubkey} />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => acceptJoinRequest(event.pubkey)}
                          >
                            {t("join.request.accept.action", "Accept")}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => rejectJoinRequest(event.pubkey)}
                          >
                            {t("join.request.reject.action", "Reject")}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          )}

          {/* Invite Codes Section */}
          {isAdmin && canSign && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Ticket className="h-5 w-5" />
                <h3 className="text-sm font-medium">
                  {t("group.settings.invite_codes.title", "Invite Codes")}
                </h3>
              </div>

              <p className="text-sm text-muted-foreground">
                {t(
                  "group.settings.invite_codes.description",
                  "Create invite codes to allow specific users to join your group.",
                )}
              </p>

              {/* Create Invite Code Dialog */}
              <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
                <DialogTrigger asChild>
                  <Button className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    {t(
                      "group.settings.invite_codes.create_button",
                      "Create Invite Code",
                    )}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>
                      {createdInviteCode
                        ? t(
                            "group.settings.invite_codes.dialog.created_title",
                            "Invite Code Created",
                          )
                        : t(
                            "group.settings.invite_codes.dialog.title",
                            "Create Invite Code",
                          )}
                    </DialogTitle>
                    <DialogDescription>
                      {createdInviteCode
                        ? t(
                            "group.settings.invite_codes.dialog.created_description",
                            "Your invite code has been created successfully. Share this code with users you want to invite to the group.",
                          )
                        : t(
                            "group.settings.invite_codes.dialog.description",
                            "Choose when this invite code should expire. The code will be automatically revoked after the expiration date.",
                          )}
                    </DialogDescription>
                  </DialogHeader>

                  {createdInviteCode ? (
                    // Show created code and URL
                    <div className="space-y-6 py-4">
                      {/* Invite Code Section */}
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">
                          {t(
                            "group.settings.invite_codes.dialog.your_code",
                            "Invite Code",
                          )}
                        </Label>
                        <InputCopy value={createdInviteCode} />
                      </div>

                      {/* Invite URL Section */}
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">
                          {t(
                            "group.settings.invite_codes.dialog.invite_url",
                            "Invite URL",
                          )}
                        </Label>
                        <InputCopy
                          value={generateInviteUrl(createdInviteCode)}
                        />
                      </div>

                      <p className="text-xs text-muted-foreground text-center">
                        {t(
                          "group.settings.invite_codes.dialog.share_hint",
                          "Share the code or URL with users you want to invite to your group",
                        )}
                      </p>
                    </div>
                  ) : (
                    // Show creation form
                    <div className="space-y-6 py-4">
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">
                          {t(
                            "group.settings.invite_codes.dialog.expiration",
                            "Expiration",
                          )}
                        </Label>
                        <RadioGroup
                          value={selectedExpiration}
                          onValueChange={setSelectedExpiration}
                          className="space-y-3"
                        >
                          {[
                            {
                              value: "1week",
                              label: t(
                                "group.settings.invite_codes.dialog.1week",
                                "1 Week",
                              ),
                            },
                            {
                              value: "1month",
                              label: t(
                                "group.settings.invite_codes.dialog.1month",
                                "1 Month",
                              ),
                            },
                            {
                              value: "1year",
                              label: t(
                                "group.settings.invite_codes.dialog.1year",
                                "1 Year",
                              ),
                            },
                            {
                              value: "never",
                              label: t(
                                "group.settings.invite_codes.dialog.never",
                                "Never (No Expiry)",
                              ),
                            },
                          ].map((option) => (
                            <div
                              key={option.value}
                              className="flex items-center space-x-3"
                            >
                              <RadioGroupItem
                                value={option.value}
                                id={option.value}
                              />
                              <Label
                                htmlFor={option.value}
                                className="text-sm font-normal cursor-pointer"
                              >
                                {option.label}
                              </Label>
                            </div>
                          ))}
                        </RadioGroup>
                      </div>
                    </div>
                  )}

                  <DialogFooter className="gap-3 pt-4">
                    {createdInviteCode ? (
                      <Button onClick={handleCloseDialog} className="w-full">
                        {t("group.settings.invite_codes.dialog.done", "Done")}
                      </Button>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          onClick={handleCloseDialog}
                          disabled={isCreatingCode}
                        >
                          {t(
                            "group.settings.invite_codes.dialog.cancel",
                            "Cancel",
                          )}
                        </Button>
                        <Button
                          onClick={handleCreateInviteCode}
                          disabled={isCreatingCode}
                        >
                          {isCreatingCode ? (
                            <RotateCw className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Plus className="h-4 w-4 mr-2" />
                          )}
                          {isCreatingCode
                            ? t(
                                "group.settings.invite_codes.creating",
                                "Creating...",
                              )
                            : t(
                                "group.settings.invite_codes.create_button",
                                "Create",
                              )}
                        </Button>
                      </>
                    )}
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Active Invite Codes List */}
              {inviteCodes && inviteCodes.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium mb-3">
                    {t(
                      "group.settings.invite_codes.active",
                      "Active Invite Codes",
                    )}{" "}
                    ({inviteCodes.length})
                  </h4>

                  <div className="space-y-2">
                    {inviteCodes.map((invite: GroupInviteCode) => (
                      <div
                        key={invite.code}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                              {invite.code}
                            </code>
                            {invite.expiresAt && (
                              <span className="text-xs text-muted-foreground">
                                {t(
                                  "group.settings.invite_codes.expires",
                                  "Expires:",
                                )}{" "}
                                {new Date(
                                  invite.expiresAt * 1000,
                                ).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCopyInviteCode(invite.code)}
                            title={t(
                              "group.settings.invite_codes.copy_code",
                              "Copy code",
                            )}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCopyInviteUrl(invite.code)}
                            title={t(
                              "group.settings.invite_codes.copy_url",
                              "Copy URL",
                            )}
                          >
                            <Link className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleRevokeInviteCode(invite.code)}
                            title={t(
                              "group.settings.invite_codes.revoke",
                              "Revoke",
                            )}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {inviteCodes && inviteCodes.length === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  {t(
                    "group.settings.invite_codes.none",
                    "No active invite codes",
                  )}
                </p>
              )}
            </div>
          )}

          {/* Members List Section */}
          <div>
            <div className="space-y-4">
              {nonAdminMembers.length === 0 ? (
                <div className="py-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    {t("group.info.no-members", "No members")}
                  </p>
                </div>
              ) : (
                <div>
                  <h4 className="text-sm font-medium mb-3">
                    {t("group.info.members", "Members ({{membersLength}})", {
                      membersLength: nonAdminMembers.length,
                    })}
                  </h4>
                  <div className="space-y-1">
                    {nonAdminMembers.map((pubkey) => (
                      <div
                        key={pubkey}
                        className="flex items-center gap-3 py-2"
                      >
                        <Avatar pubkey={pubkey} className="size-8" />
                        <Name pubkey={pubkey} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "admins",
      name: t("group.settings.admins.tab", "Admins"),
      icon: <UserCheck className="h-4 w-4" />,
      children: (
        <div className="flex flex-col gap-4">
          <div className="space-y-4">
            <p className="text-xs">
              {t(
                "group.settings.admins.description",
                "Administrators have special permissions to manage the group, including adding/removing members and moderating content.",
              )}
            </p>

            {/* Current Admins List */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium mb-3">
                {t("group.settings.admins.current", "Current Administrators")} (
                {admins.length})
              </h4>

              {admins.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  {t("group.settings.admins.none", "No administrators found")}
                </p>
              ) : (
                <div className="space-y-2">
                  {admins.map((pubkey) => (
                    <div
                      key={pubkey}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar pubkey={pubkey} className="size-8" />
                        <div>
                          <Name pubkey={pubkey} />
                          {pubkey === userPubkey && (
                            <span className="text-xs text-muted-foreground ml-2">
                              ({t("group.settings.admins.you", "You")})
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isAdmin && canSign && pubkey !== userPubkey && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleRemoveAdmin(pubkey)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add New Admins Section */}
            {isAdmin && canSign && (
              <div className="space-y-3 border-t pt-4">
                <h4 className="text-sm font-medium mb-3">
                  {t("group.settings.admins.add_new", "Add New Administrators")}
                </h4>

                {/* Search Input */}
                <div className="space-y-3">
                  <Input
                    value={adminSearchQuery}
                    onChange={(e) => setAdminSearchQuery(e.target.value)}
                    placeholder={t(
                      "group.settings.admins.search_placeholder",
                      "Search members to add as admin...",
                    )}
                    className="ml-2"
                    leftIcon={
                      <Search className="h-4 w-4 text-muted-foreground" />
                    }
                  />

                  {/* Selected New Admins */}
                  {selectedNewAdmins.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          {t(
                            "group.settings.admins.selected",
                            "Selected to add",
                          )}{" "}
                          ({selectedNewAdmins.length})
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={clearNewAdmins}
                        >
                          {t("group.settings.admins.clear", "Clear")}
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {selectedNewAdmins.map((profile) => (
                          <div
                            key={profile.pubkey}
                            className="flex items-center gap-2 bg-secondary px-3 py-1 rounded-md text-sm"
                          >
                            <Avatar
                              pubkey={profile.pubkey}
                              className="size-5"
                            />
                            <span>{getProfileDisplayName(profile)}</span>
                            <button
                              onClick={() => removeNewAdmin(profile.pubkey)}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                      <Button
                        onClick={handleBatchAddAdmins}
                        disabled={selectedNewAdmins.length === 0}
                        className="w-full"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        {t(
                          "group.settings.admins.add_selected",
                          "Add Selected as Admins",
                        )}
                      </Button>
                    </div>
                  )}

                  {/* Available Members List */}
                  {adminSearchQuery && availableMembers.length > 0 && (
                    <ScrollArea className="max-h-[200px]">
                      <div className="space-y-2">
                        {availableMembers.slice(0, 10).map((profile) => (
                          <div
                            key={profile.pubkey}
                            className="flex items-center justify-between p-2 border rounded-lg hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <Avatar
                                pubkey={profile.pubkey}
                                className="size-6"
                              />
                              <span className="text-sm">
                                {getProfileDisplayName(profile)}
                              </span>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => addNewAdmin(profile)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                        {availableMembers.length > 10 && (
                          <p className="text-xs text-muted-foreground text-center py-2">
                            {t(
                              "group.settings.admins.more_results",
                              "{{count}} more results...",
                              {
                                count: availableMembers.length - 10,
                              },
                            )}
                          </p>
                        )}
                      </div>
                    </ScrollArea>
                  )}

                  {adminSearchQuery && availableMembers.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      {t(
                        "group.settings.admins.no_results",
                        "No members found matching your search",
                      )}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      ),
    },
  ];

  return <TabContainer tabs={tabs} defaultTab="information" className="mb-2" />;
}

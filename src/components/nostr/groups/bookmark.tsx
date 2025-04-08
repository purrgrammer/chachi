import { useState } from "react";
import { useAtomValue } from "jotai";
import { toast } from "sonner";
import { NostrEvent } from "nostr-tools";
import { Bookmark, BookmarkCheck, DoorOpen } from "lucide-react";
import { NDKEvent, NDKKind } from "@nostr-dev-kit/ndk";
import { groupsAtom, groupsContentAtom } from "@/app/store";
import { Button } from "@/components/ui/button";
import { Group } from "@/lib/types";
import { isRelayURL } from "@/lib/relay";
import { useRelays, useRelaySet } from "@/lib/nostr";
import { useLeaveRequest } from "@/lib/nostr/groups";
import { useAccount } from "@/lib/account";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useNDK } from "@/lib/ndk";
import { useTranslation } from "react-i18next";

export function ConfirmGroupLeaveDialog({
  open,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t("group.leave.confirmation.title")}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t("group.leave.confirmation.description")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>
            {t("group.leave.confirmation.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            <DoorOpen className="size-8" />{" "}
            {t("group.leave.confirmation.confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function useBookmarkGroup(group: Group) {
  const { t } = useTranslation();
  const ndk = useNDK();
  const groups = useAtomValue(groupsAtom);
  const isBookmarked = groups.find(
    (g) => group.id === g.id && group.relay == g.relay,
  );
  const groupsContent = useAtomValue(groupsContentAtom);
  const userRelays = useRelays();
  const relaySet = useRelaySet(userRelays.filter((r) => isRelayURL(r)));
  async function bookmarkGroup() {
    try {
      const newGroups = [...groups, group];
      const event = new NDKEvent(ndk, {
        kind: NDKKind.SimpleGroupList,
        content: groupsContent,
        tags: newGroups.map((g) => [
          "group",
          g.id,
          g.relay,
          ...(g.isCommunity ? ["community"] : []),
        ]),
      } as NostrEvent);
      await event.publish(relaySet);
      //setGroups(newGroups);
    } catch (err) {
      console.error(err);
      toast.error(t("group.bookmark.error"));
    }
  }

  async function unbookmarkGroup() {
    try {
      const newGroups = groups.filter(
        (g) => g.id !== group.id || g.relay !== group.relay,
      );
      const event = new NDKEvent(ndk, {
        kind: NDKKind.SimpleGroupList,
        content: groupsContent,
        tags: newGroups.map((g) => [
          "group",
          g.id,
          g.relay,
          ...(g.isCommunity ? ["community"] : []),
        ]),
      } as NostrEvent);
      await event.publish(relaySet);
      //setGroups(newGroups);
    } catch (err) {
      console.error(err);
      toast.error(t("group.unbookmark.error"));
    }
  }

  return { isBookmarked, bookmarkGroup, unbookmarkGroup };
}

export function BookmarkGroup({ group }: { group: Group }) {
  const [confirmLeave, setConfirmLeave] = useState(false);
  const account = useAccount();
  const { isBookmarked, bookmarkGroup, unbookmarkGroup } =
    useBookmarkGroup(group);
  const sendLeaveRequest = useLeaveRequest(group);
  const { t } = useTranslation();
  async function leaveGroup() {
    try {
      await sendLeaveRequest();
      unbookmarkGroup();
      toast.success(t("group.leave.success"));
      setConfirmLeave(false);
    } catch (err) {
      console.error(err);
      toast.error(t("group.leave.error"));
    }
  }

  if (account?.isReadOnly) {
    return null;
  }

  return (
    <>
      <ConfirmGroupLeaveDialog
        open={confirmLeave}
        onConfirm={leaveGroup}
        onCancel={() => setConfirmLeave(false)}
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Unbookmark group"
            onClick={unbookmarkGroup}
          >
            {isBookmarked ? (
              <BookmarkCheck className="size-5" />
            ) : (
              <Bookmark className="size-5" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          <DropdownMenuGroup>
            <DropdownMenuItem
              onClick={() =>
                isBookmarked ? unbookmarkGroup() : bookmarkGroup()
              }
            >
              {isBookmarked ? (
                <Bookmark className="size-5" />
              ) : (
                <BookmarkCheck className="size-5" />
              )}
              {isBookmarked
                ? t("group.unbookmark.trigger")
                : t("group.bookmark.trigger")}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive dark:bg-destructive dark:text-destructive-foreground"
              onClick={() => setConfirmLeave(true)}
            >
              <DoorOpen className="size-5" />
              {t("group.leave.trigger")}
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

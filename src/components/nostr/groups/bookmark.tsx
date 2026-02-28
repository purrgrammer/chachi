import { useState } from "react";
import { useAtomValue } from "jotai";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Bookmark, BookmarkCheck, DoorOpen } from "lucide-react";
import { groupsAtom } from "@/app/store";
import { Button } from "@/components/ui/button";
import { Group } from "@/lib/types";
import { isRelayURL } from "@/lib/relay";
import { fetchLatest, useRelays, useRelaySet } from "@/lib/nostr";
import { useLeaveRequest } from "@/lib/nostr/groups";
import { useAccount, usePubkey } from "@/lib/account";
import {
  usePublishSimpleGroupList,
  usePublishEvent,
} from "@/lib/nostr/publishing";
import { useNDK } from "@/lib/ndk";
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
import { useTranslation } from "react-i18next";
import { RELATIONSHIP } from "@/lib/kinds";
import { groupId } from "@/lib/groups";

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
    <AlertDialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
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
          <AlertDialogCancel>
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
  const isBookmarked = groups.find((g) => groupId(g) === groupId(group));
  const userRelays = useRelays();
  const relaySet = useRelaySet(userRelays.filter((r) => isRelayURL(r)));
  const pubkey = usePubkey();
  const publishGroupList = usePublishSimpleGroupList();
  const publish = usePublishEvent();

  async function bookmarkGroup() {
    if (!pubkey || !relaySet) return;
    try {
      const newGroups = [...groups, group];
      if (group.isCommunity) {
        const existing = await fetchLatest(
          ndk,
          {
            kinds: [RELATIONSHIP],
            authors: [pubkey!],
            "#d": [group.id],
          },
          relaySet,
        );
        const template = {
          kind: RELATIONSHIP,
          content: "",
          tags: [
            ...(existing ? existing.tags : []),
            ["d", group.id],
            ["n", "follow"],
          ],
          created_at: Math.floor(Date.now() / 1000),
        };
        await publish(template, userRelays.filter((r) => isRelayURL(r)));
      } else {
        await publishGroupList(newGroups, userRelays.filter((r) => isRelayURL(r)));
      }
      //setGroups(newGroups);
    } catch (err) {
      console.error(err);
      toast.error(t("group.bookmark.error"));
    }
  }

  async function unbookmarkGroup() {
    if (!pubkey || !relaySet) return;
    try {
      const newGroups = groups.filter((g) => groupId(g) !== groupId(group));
      if (group.isCommunity) {
        const existing = await fetchLatest(
          ndk,
          {
            kinds: [RELATIONSHIP],
            authors: [pubkey!],
            "#d": [group.id],
          },
          relaySet,
        );
        const template = {
          kind: RELATIONSHIP,
          content: "",
          tags: [
            ...(existing ? existing.tags.filter((t) => t[1] !== "follow") : []),
            ["d", group.id],
          ],
          created_at: Math.floor(Date.now() / 1000),
        };
        await publish(template, userRelays.filter((r) => isRelayURL(r)));
      } else {
        await publishGroupList(newGroups, userRelays.filter((r) => isRelayURL(r)));
      }
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
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const account = useAccount();
  const { isBookmarked, bookmarkGroup, unbookmarkGroup } =
    useBookmarkGroup(group);
  const sendLeaveRequest = useLeaveRequest(group);
  const { t } = useTranslation();
  async function leaveGroup() {
    try {
      await sendLeaveRequest();
      await unbookmarkGroup();
      toast.success(t("group.leave.success"));
      setConfirmLeave(false);
      navigate('/');
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
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Group actions"
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
              onClick={async () => {
                if (isBookmarked) {
                  await unbookmarkGroup();
                  navigate('/');
                } else {
                  await bookmarkGroup();
                }
              }}
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
              onClick={() => {
                setMenuOpen(false);
                setConfirmLeave(true);
              }}
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

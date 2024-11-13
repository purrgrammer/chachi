import { useAtomValue } from "jotai";
import { toast } from "sonner";
import { NostrEvent } from "nostr-tools";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { NDKEvent, NDKKind } from "@nostr-dev-kit/ndk";
import { groupsAtom, groupsContentAtom } from "@/app/store";
import { Button } from "@/components/ui/button";
import { Group } from "@/lib/types";
import { useRelays, useRelaySet } from "@/lib/nostr";
import { useAccount } from "@/lib/account";
import { useNDK } from "@/lib/ndk";

export function useBookmarkGroup(group: Group) {
  const ndk = useNDK();
  const groups = useAtomValue(groupsAtom);
  const isBookmarked = groups.find(
    (g) => group.id === g.id && group.relay == g.relay,
  );
  const groupsContent = useAtomValue(groupsContentAtom);
  const userRelays = useRelays();
  const relaySet = useRelaySet(userRelays);
  async function bookmarkGroup() {
    try {
      const newGroups = [...groups, group];
      // todo: don't nuke content since 0xchat uses encrypted tags for groups
      const event = new NDKEvent(ndk, {
        kind: NDKKind.SimpleGroupList,
        content: groupsContent,
        tags: newGroups.map((g) => ["group", g.id, g.relay]),
      } as NostrEvent);
      await event.publish(relaySet);
      //setGroups(newGroups);
    } catch (err) {
      console.error(err);
      toast.error("Error bookmarking group");
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
        tags: newGroups.map((g) => ["group", g.id, g.relay]),
      } as NostrEvent);
      await event.publish(relaySet);
      //setGroups(newGroups);
    } catch (err) {
      console.error(err);
      toast.error("Error unbookmarking group");
    }
  }

  return { isBookmarked, bookmarkGroup, unbookmarkGroup};
}

export function BookmarkGroup({ group }: { group: Group }) {
  const account = useAccount();
  const { isBookmarked, bookmarkGroup, unbookmarkGroup } = useBookmarkGroup(group);

  if (account?.isReadOnly) {
    return null;
  }

  return isBookmarked ? (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Unbookmark group"
      onClick={unbookmarkGroup}
    >
      <BookmarkCheck className="size-5" />
    </Button>
  ) : (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Bookmark group"
      onClick={bookmarkGroup}
    >
      <Bookmark className="size-5" />
    </Button>
  );
}

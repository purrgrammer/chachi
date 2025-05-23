import { useEffect, useMemo, useRef } from "react";
import type { NostrEvent } from "nostr-tools";
import {
  NDKKind,
  NDKRelaySet,
  NDKSubscription,
  NDKSubscriptionCacheUsage,
} from "@nostr-dev-kit/ndk";
import { useNDK } from "@/lib/ndk";
import { saveGroupEvent } from "@/lib/messages";
import { getLastGroupMessage } from "@/lib/messages/queries";
import { useStream } from "@/lib/nostr";
import type { Group } from "@/lib/types";
import { groupId } from "@/lib/groups";
import { DELETE_GROUP, RELATIONSHIP } from "@/lib/kinds";

export function useDeletions(group: Group) {
  return useStream(
    {
      kinds: [NDKKind.EventDeletion, 9005 as NDKKind],
      "#h": [group.id],
    },
    [group.relay],
  );
}

export function useGroupMessages(groups: Group[]) {
  const ndk = useNDK();
  const subscriptionsRef = useRef<Map<string, NDKSubscription>>(new Map());
  const prevGroupsRef = useRef<Group[]>([]);
  const id = useMemo(() => groups.map(groupId).join("-"), [groups]);

  useEffect(() => {
    return () => {
      console.log("SYNC.GROUP.MESSAGES>COMPONENT_UNMOUNT");
      for (const [id, sub] of subscriptionsRef.current) {
        console.log("SYNC.GROUP.MESSAGES>FINAL_CLEANUP", id);
        sub.stop();
      }
      subscriptionsRef.current.clear();
    };
  }, []);

  useEffect(() => {
    const currentGroupIds = new Set(groups.map(groupId));
    const prevGroupIds = new Set(prevGroupsRef.current.map(groupId));

    // Find groups to add (new groups)
    const groupsToAdd = groups.filter(
      (group) => !prevGroupIds.has(groupId(group)),
    );

    // Find groups to remove (groups no longer in the list)
    const groupIdsToRemove = Array.from(prevGroupIds).filter(
      (id) => !currentGroupIds.has(id),
    );

    async function handleGroupChanges() {
      console.log("SYNC.GROUP.MESSAGES>CHANGES", {
        groupsToAdd: groupsToAdd.map(groupId),
        groupIdsToRemove,
      });

      // Stop and remove subscriptions for removed groups
      for (const groupIdToRemove of groupIdsToRemove) {
        const sub = subscriptionsRef.current.get(groupIdToRemove);
        if (sub) {
          console.log("SYNC.GROUP.MESSAGES>STOPPING", groupIdToRemove);
          sub.stop();
          subscriptionsRef.current.delete(groupIdToRemove);
        }
      }

      // Start subscriptions for new groups
      for (const group of groupsToAdd) {
        const { id, relay } = group;
        console.log("SYNC.GROUP.MESSAGES>STARTING", group);

        const lastMessage = await getLastGroupMessage(group);
        const relaySet = NDKRelaySet.fromRelayUrls([relay], ndk);
        const filter = {
          kinds: [
            NDKKind.GroupChat,
            NDKKind.GroupAdminAddUser,
            NDKKind.GroupAdminRemoveUser,
            DELETE_GROUP,
            NDKKind.Nutzap,
            RELATIONSHIP,
          ],
          "#h": [id],
          ...(lastMessage ? { since: lastMessage.created_at + 1 } : {}),
        };

        console.log("SYNC.GROUP.MESSAGES>GROUP", filter);

        const sub = ndk.subscribe(
          filter,
          {
            cacheUsage: NDKSubscriptionCacheUsage.ONLY_RELAY,
            groupable: false,
            closeOnEose: false,
          },
          relaySet,
        );

        sub.on("event", (event) => {
          console.log("SYNC.GROUP.MESSAGES>EVENT", group, event.rawEvent());
          saveGroupEvent(event.rawEvent() as NostrEvent, group);
        });

        subscriptionsRef.current.set(id, sub as NDKSubscription);
      }
    }

    handleGroupChanges();

    // Update previous groups reference
    prevGroupsRef.current = groups;

    // No cleanup needed here - group changes are handled in the main logic above
  }, [id]);
}

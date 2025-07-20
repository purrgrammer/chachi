import { useEffect, useMemo, useRef } from "react";
import type { NostrEvent } from "nostr-tools";
import {
  NDKKind,
  NDKRelaySet,
  NDKSubscription,
  NDKSubscriptionCacheUsage,
} from "@nostr-dev-kit/ndk";
import { useNDK } from "@/lib/ndk";
import { deleteGroupEvent, saveGroupEvent } from "@/lib/messages";
import { getLastGroupMessage } from "@/lib/messages/queries";
import type { Group } from "@/lib/types";
import { groupId } from "@/lib/groups";
import { DELETE_GROUP, RELATIONSHIP } from "@/lib/kinds";

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
            NDKKind.EventDeletion,
            9005 as NDKKind,
          ],
          "#h": [id],
          ...(lastMessage ? { since: lastMessage.created_at + 1 } : {}),
        };

        console.log("SYNC.GROUP.MESSAGES>GROUP", filter);

        const sub = ndk.subscribe(
          filter,
          {
            cacheUsage: NDKSubscriptionCacheUsage.ONLY_RELAY,
            skipOptimisticPublishEvent: true,
            groupable: false,
            closeOnEose: false,
          },
          relaySet,
        );

        sub.on("event", (event) => {
          console.log("SYNC.GROUP.MESSAGES>EVENT", group, event.rawEvent());
          if (event.kind === NDKKind.EventDeletion || event.kind === 9005) {
            const ids = event.tags
              .filter((t) => t[0] === "e" && t[1]?.length === 64)
              .map((t) => t[1]);
            if (ids.length > 0) {
              ids.forEach((id) => deleteGroupEvent(id, group));
            }
          } else {
            saveGroupEvent(event.rawEvent() as NostrEvent, group);
          }
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

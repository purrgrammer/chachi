import { useAtomValue } from "jotai";
import { nip19 } from "nostr-tools";
import { useQuery, useQueries } from "@tanstack/react-query";
import { groupId } from "@/lib/groups";
import { randomCode } from "@/lib/id";
import NDK, {
  NDKEvent,
  NDKRelaySet,
  NDKKind,
  NDKSubscriptionCacheUsage,
} from "@nostr-dev-kit/ndk";
import { NostrEvent } from "nostr-tools";
import { followsAtom } from "@/app/store";
import { useNDK } from "@/lib/ndk";
import {
  useRelays,
  useRelayList,
  useRelaySet,
  useStream,
  fetchProfile,
  fetchRelayList,
  fetchLatest,
} from "@/lib/nostr";
import { nip29Relays, discoveryRelays, isRelayURL } from "@/lib/relay";
import { useAccount } from "@/lib/account";
import { useRelayInfo, fetchRelayInfo } from "@/lib/relay";
import { LEAVE_REQUEST, COMMUNIKEY } from "@/lib/kinds";
import type {
  Group,
  GroupMembers,
  GroupMetadata,
  GroupRole,
  GroupInviteCode,
  Community,
  ContentSection,
} from "@/lib/types";
import {
  queryClient,
  GROUPS,
  USER_GROUPS,
  CLOSE_GROUPS,
  GROUP_METADATA,
  GROUP_MEMBERS,
  GROUP_ADMINS,
  GROUP_ROLES,
} from "@/lib/query";
import {
  getGroupInfo,
  saveGroupInfo,
  saveCommunity,
  getCommunity,
} from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useMemo } from "react";

export function useUserGroups(pubkey: string) {
  const ndk = useNDK();
  const { data: userRelays } = useRelayList(pubkey);
  const defaultRelays = useRelays();
  const relays = userRelays?.filter(isRelayURL).slice(0, 5) ?? defaultRelays;
  const relaySet = useRelaySet(relays);
  return useQuery({
    queryKey: [USER_GROUPS, pubkey, ...relays],
    queryFn: async () => {
      const groupLists = Array.from(
        await ndk.fetchEvents(
          {
            kinds: [NDKKind.SimpleGroupList],
            authors: [pubkey],
          },
          {
            closeOnEose: true,
          },
          relaySet,
        ),
      );
      if (groupLists.length === 0) return [];
      const groupList = groupLists.reduce((acc, ev) => {
        if ((ev.created_at || 0) > (acc.created_at || 0)) return ev;
        return acc;
      }, groupLists[0]);
      return (
        groupList.tags
          .filter((t) => t[0] === "group" && t[1] && t[2] && isRelayURL(t[2]))
          .map((t) => ({ id: t[1], relay: t[2] }) as Group) ?? []
      );
    },
    staleTime: Infinity,
    gcTime: 0,
  });
}

function groupMetadata(ev: NDKEvent, id: string, relay: string) {
  return {
    id,
    relay,
    name: ev.tagValue("name") || "",
    about: ev.tagValue("about"),
    picture: ev.tagValue("picture"),
    visibility: ev.tags.find((t) => t[0] === "private") ? "private" : "public",
    access: ev.tags.find((t) => t[0] === "closed") ? "closed" : "open",
    pubkey: ev.pubkey,
  } as GroupMetadata;
}

export async function fetchGroupMetadata(ndk: NDK, group: Group) {
  // todo: useRelayInfo
  if (group.id === "_") {
    return fetchRelayInfo(group.relay).then((info) => {
      const metadata = {
        id: group.id,
        relay: group.relay,
        pubkey: info.pubkey,
        name: info.name,
        about: info.description,
        picture: info.icon,
      } as GroupMetadata;
      return metadata;
    });
  } else {
    return ndk
      .fetchEvent(
        { kinds: [NDKKind.GroupMetadata], "#d": [group.id] },
        {
          closeOnEose: true,
          cacheUsage: NDKSubscriptionCacheUsage.CACHE_FIRST,
        },
        NDKRelaySet.fromRelayUrls([group.relay], ndk),
      )
      .then(async (ev: NDKEvent | null) => {
        if (!ev) {
          if (group.id.length === 64) {
            const relays = await fetchRelayList(ndk, group.id);
            return ndk
              .fetchEvent(
                { kinds: [COMMUNIKEY], authors: [group.id] },
                {
                  closeOnEose: true,
                  cacheUsage: NDKSubscriptionCacheUsage.ONLY_RELAY,
                },
                relays ? NDKRelaySet.fromRelayUrls(relays, ndk) : undefined,
              )
              .then(async (ev: NDKEvent | null) => {
                if (!ev) throw new Error("Can't find group metadata");
                const profile = await fetchProfile(ndk, group.id, []);
                const relay = ev.tags.find((t) => t[0] === "r")?.[1];
                if (!relay) throw new Error("Can't find community relay");
                const backupRelays = ev.tags
                  .filter((t) => t[0] === "r")
                  .map((t) => t[1])
                  .slice(1);
                return {
                  id: group.id,
                  pubkey: ev.pubkey,
                  relay,
                  name: profile?.name || group.id,
                  about: profile?.about || "",
                  picture: profile?.picture || "",
                  isCommunity: true,
                  nlink: nip19.naddrEncode({
                    kind: COMMUNIKEY,
                    pubkey: group.id,
                    relays: [relay, ...backupRelays],
                    identifier: "",
                  }),
                } as GroupMetadata;
              });
          } else {
            throw new Error("Can't find group metadata");
          }
        }
        return {
          id: group.id,
          pubkey: ev.pubkey,
          relay: group.relay,
          name: ev.tagValue("name") || "",
          about: ev.tagValue("about"),
          picture: ev.tagValue("picture"),
          visibility: ev.tags.find((t) => t[0] === "private")
            ? "private"
            : "public",
          access: ev.tags.find((t) => t[0] === "closed") ? "closed" : "open",
          nlink: nip19.naddrEncode({
            kind: NDKKind.GroupMetadata,
            pubkey: ev.pubkey,
            relays: [group.relay],
            identifier: group.id,
          }),
        } as GroupMetadata;
      });
  }
}

async function fetchGroups(ndk: NDK, relay: string) {
  return ndk
    .fetchEvents(
      { kinds: [NDKKind.GroupMetadata] },
      { closeOnEose: true, cacheUsage: NDKSubscriptionCacheUsage.ONLY_RELAY },
      NDKRelaySet.fromRelayUrls([relay], ndk),
    )
    .then((events) => {
      return Array.from(events).map((ev) =>
        groupMetadata(ev, ev.tagValue("d")!, relay),
      ) as GroupMetadata[];
    });
}

export function useGroup(group?: Group) {
  const ndk = useNDK();
  return useQuery({
    enabled: Boolean(group),
    queryKey: [GROUP_METADATA, group ? groupId(group) : "undefined"],
    queryFn: async () => {
      if (!group) throw new Error("Group not found");
      const cached = await getGroupInfo(group);
      if (cached) {
        return cached;
      }
      const metadata = await fetchGroupMetadata(ndk, group);
      if (metadata) {
        saveGroupInfo(group, metadata);
      }
      return metadata;
    },
    staleTime: Infinity,
    gcTime: 0,
  });
}

export function useGroups(groups: Group[]) {
  const ndk = useNDK();
  return useQueries({
    queries: groups.map((group) => ({
      queryKey: [GROUP_METADATA, groupId(group)],
      queryFn: async () => {
        console.log("SYNC.GROUP.MESSAGES>METADATA", groupId(group));
        if (!group) throw new Error("Group not found");
        const metadata = await fetchGroupMetadata(ndk, group);
        if (metadata) {
          saveGroupInfo(group, metadata);
        }
        return metadata;
      },
      staleTime: Infinity,
      gcTime: 0,
    })),
  });
}

export function useAllGroups(relays: string[]) {
  const ndk = useNDK();
  return useQueries({
    queries: relays.map((relay) => ({
      queryKey: [GROUPS, relay],
      queryFn: () => fetchGroups(ndk, relay),
      staleTime: Infinity,
      gcTime: 0,
    })),
  });
}

function useGroupMembers(group: Group) {
  const ndk = useNDK();
  const relaySet = useRelaySet([group.relay]);
  return useQuery({
    queryKey: [GROUP_MEMBERS, group.id, group.relay],
    queryFn: async () => {
      if (group.id === "_") return [];
      return ndk
        .fetchEvent(
          {
            kinds: [NDKKind.GroupMembers],
            "#d": [group.id],
          },
          { closeOnEose: true },
          relaySet,
        )
        .then((event) => {
          if (event) {
            const pTags = event.tags.filter((t) => t[0] === "p");
            const pubkeys = pTags.map((t) => t[1]);
            return pubkeys;
          }
          return [];
        });
    },
  });
}

export function useGroupAdminsList(group?: Group) {
  const ndk = useNDK();
  const relaySet = useRelaySet(group ? [group.relay] : []);
  return useQuery({
    enabled: Boolean(group),
    queryKey: ["admin-list", group?.id, group?.relay],
    queryFn: async () => {
      if (!group) return [];
      if (group.id === "_") return [];
      return ndk
        .fetchEvent(
          {
            kinds: [NDKKind.GroupAdmins],
            "#d": [group.id],
          },
          { closeOnEose: true },
          relaySet,
        )
        .then((event) => {
          if (event) {
            const pTags = event.tags.filter((t) => t[0] === "p");
            const pubkeys = pTags.map((t) => t[1]);
            return pubkeys;
          }
          return [];
        })
        .catch((err) => console.error(err));
    },
  });
}
export function useGroupAdmins(group: Group) {
  // todo: support relay groups
  const ndk = useNDK();
  const relaySet = useRelaySet([group.relay]);
  return useQuery({
    queryKey: [GROUP_ADMINS, group.id, group.relay],
    queryFn: async () => {
      if (group.id === "_") return { pubkeys: [], roles: {} };
      return ndk
        .fetchEvent(
          {
            kinds: [NDKKind.GroupAdmins],
            "#d": [group.id],
          },
          { closeOnEose: true },
          relaySet,
        )
        .then((event) => {
          if (event) {
            const pTags = event.tags.filter((t) => t[0] === "p");
            const pubkeys = pTags.map((t) => t[1]);
            const roles = {} as Record<string, string[]>;
            //const roles = pTags.reduce((acc, p) => {
            //  const [, pubkey, role, ...permissions] = p;
            //  return {
            //    ...acc,
            //    [pubkey]: { role: role || "Admin", permissions },
            //  };
            //}, roles);
            return { pubkeys, roles };
          }
          return { pubkeys: [], roles: {} };
        })
        .catch((err) => console.error(err));
    },
  });
}

export function useGroupParticipants(group: Group) {
  const { data: metadata } = useGroup(group);
  const { data: members, isSuccess: membersFetched } = useGroupMembers(group);
  const { data: admins, isSuccess: adminsFetched } = useGroupAdmins(group);
  return {
    isSuccess: membersFetched && adminsFetched,
    admins:
      metadata?.isCommunity && metadata.pubkey
        ? [metadata.pubkey]
        : admins?.pubkeys
          ? admins.pubkeys
          : [],
    members: members || [],
    roles: admins?.roles || {},
  };
}

export function useCloseGroups() {
  const ndk = useNDK();
  const relaySet = useRelaySet(nip29Relays);
  const me = useAccount()?.pubkey;
  const follows = useAtomValue(followsAtom);
  return useQuery({
    enabled: follows.length > 0 && !!me,
    queryKey: [CLOSE_GROUPS, me],
    queryFn: async () => {
      const events = await ndk.fetchEvents(
        { kinds: [NDKKind.GroupMembers], "#p": follows },
        { closeOnEose: true, cacheUsage: NDKSubscriptionCacheUsage.ONLY_RELAY },
        relaySet,
      );
      // todo: get metadatas
      const closeGroups = Array.from(events)
        .map((e) => {
          const id = e.tagValue("d");
          const relay = e.relay?.url?.replace(/\/$/, "");
          const members = e.tags
            .filter((t) => t[0] === "p")
            .map((t) => t[1])
            .filter((p) => p !== me && follows.includes(p));
          if (id && relay) return { id, relay, members } as GroupMembers;
        })
        .filter(Boolean) as GroupMembers[];
      //const metadatas = await Promise.all(closeGroups.map((g: Group) => fetchGroupMetadata(ndk, g)));
      //return metadatas.map(g => ({...g, members: closeGroups.find(cg => cg.id === g.id && cg.relay === g.relay)?.members || []}));
      return closeGroups.filter((g: GroupMembers) => g.members.length > 0);
    },
    staleTime: Infinity,
    gcTime: 0,
  });
}

// Group creation and edition

export function useCreateGroup() {
  const ndk = useNDK();
  const account = useAccount();

  return async (id: string, relay: string): Promise<Group> => {
    if (!account || account.isReadOnly) throw new Error("Can't sign events");

    const relaySet = NDKRelaySet.fromRelayUrls([relay], ndk);
    const create = new NDKEvent(ndk, {
      kind: NDKKind.GroupAdminCreateGroup,
      content: "",
      tags: [["h", id]],
    } as NostrEvent);
    await create.publish(relaySet);
    return { id, relay };
  };
}

export function useEditGroup() {
  const ndk = useNDK();
  const account = useAccount();

  return async (metadata: GroupMetadata) => {
    if (!account || account.isReadOnly) throw new Error("Can't edit group");
    const { id, relay } = metadata;
    const relaySet = NDKRelaySet.fromRelayUrls([relay], ndk);

    // Create a single edit-metadata event with all fields (kind 9002)
    const edit = new NDKEvent(ndk, {
      kind: NDKKind.GroupAdminEditMetadata,
      content: "",
      tags: [["h", id]],
    } as NostrEvent);

    // Add metadata fields
    if (metadata.name) edit.tags.push(["name", metadata.name]);
    if (metadata.about) edit.tags.push(["about", metadata.about]);
    if (metadata.picture) edit.tags.push(["picture", metadata.picture]);

    // Add visibility and access as single-element tags per NIP-29 spec
    if (metadata.visibility === "private") {
      edit.tags.push(["private"]);
    } else {
      edit.tags.push(["public"]);
    }

    if (metadata.access === "closed") {
      edit.tags.push(["closed"]);
    } else {
      edit.tags.push(["open"]);
    }

    await edit.publish(relaySet);

    // Store the updated group info in the database
    await saveGroupInfo({ id, relay }, metadata);

    queryClient.invalidateQueries({
      queryKey: [GROUP_METADATA, groupId(metadata)],
    });
  };
}

// Admin

export function useJoinRequests(group: Group) {
  return useStream(
    {
      kinds: [NDKKind.GroupAdminRequestJoin],
      "#h": [group.id],
    },
    [group.relay],
  );
}

export function useJoined(group: Group) {
  return useStream(
    {
      kinds: [NDKKind.GroupAdminRequestJoin],
      "#h": [group.id],
    },
    [group.relay],
  );
}

export function useRequestedToJoin(group: Group, pubkey: string) {
  return useStream(
    {
      kinds: [NDKKind.GroupAdminRequestJoin],
      authors: [pubkey],
      "#h": [group.id],
    },
    [group.relay],
  );
}

export function useJoinRequest(group: Group) {
  const ndk = useNDK();
  const relaySet = useRelaySet([group.relay]);
  return async (inviteCode?: string) => {
    const tags = [["h", group.id]];

    // Add invite code if provided
    if (inviteCode) {
      tags.push(["code", inviteCode]);
    }

    const event = new NDKEvent(ndk, {
      kind: NDKKind.GroupAdminRequestJoin,
      content: "",
      tags,
    } as NostrEvent);
    await event.publish(relaySet);
    return event.rawEvent() as NostrEvent;
  };
}

export function useLeaveRequest(group: Group) {
  const ndk = useNDK();
  const relaySet = useRelaySet([group.relay]);
  return async () => {
    if (group.id !== "_") {
      const event = new NDKEvent(ndk, {
        kind: LEAVE_REQUEST,
        content: "",
        tags: [["h", group.id]],
      } as NostrEvent);
      await event.publish(relaySet);
      return event.rawEvent() as NostrEvent;
    }
  };
}

export function useAddUser(group: Group) {
  const ndk = useNDK();
  const relaySet = useRelaySet([group.relay]);
  return async (pubkey: string): Promise<NostrEvent> => {
    const event = new NDKEvent(ndk, {
      kind: NDKKind.GroupAdminAddUser,
      content: "",
      tags: [
        ["h", group.id],
        ["p", pubkey],
      ],
    } as NostrEvent);
    await event.publish(relaySet);
    return event.rawEvent() as NostrEvent;
  };
}

export function useRemoveUser(group: Group) {
  const ndk = useNDK();
  const relaySet = useRelaySet([group.relay]);
  return async (pubkey: string): Promise<NostrEvent> => {
    const event = new NDKEvent(ndk, {
      kind: NDKKind.GroupAdminRemoveUser,
      content: "",
      tags: [
        ["h", group.id],
        ["p", pubkey],
      ],
    } as NostrEvent);
    await event.publish(relaySet);
    return event.rawEvent() as NostrEvent;
  };
}

export function useDeleteEvent(group: Group) {
  const ndk = useNDK();
  const relaySet = useRelaySet([group.relay]);
  return async (ev: NostrEvent) => {
    const ndkEvent = new NDKEvent(ndk, ev);
    const event = new NDKEvent(ndk, {
      kind: 9005 as NDKKind,
      content: "",
      tags: [["h", group.id]],
    } as NostrEvent);
    event.tag(ndkEvent);
    await event.publish(relaySet);
    return event.rawEvent() as NostrEvent;
  };
}

// Invite code management functions following NIP-29

export function useCreateInviteCode(group: Group) {
  const ndk = useNDK();
  const relaySet = useRelaySet([group.relay]);
  return async (expiresAt?: number): Promise<string> => {
    const code = randomCode();
    const event = new NDKEvent(ndk, {
      kind: 9009 as NDKKind,
      content: "",
      tags: [
        ["h", group.id, group.relay],
        ["code", code],
        ...(expiresAt ? [["expiration", expiresAt.toString()]] : []),
      ],
    } as NostrEvent);
    await event.publish(relaySet);
    return code;
  };
}

export function useValidateInviteCode(group: Group) {
  const ndk = useNDK();
  const relaySet = useRelaySet([group.relay]);
  return async (code: string): Promise<boolean> => {
    try {
      const inviteEvents = await ndk.fetchEvents(
        {
          kinds: [9009 as NDKKind],
          "#h": [group.id],
          "#code": [code],
        },
        {
          closeOnEose: true,
          cacheUsage: NDKSubscriptionCacheUsage.ONLY_RELAY,
        },
        relaySet,
      );

      if (inviteEvents.size === 0) return false;

      const inviteEvent = Array.from(inviteEvents)[0];
      const expirationTag = inviteEvent.tags.find((t) => t[0] === "expiration");

      if (expirationTag) {
        const expiresAt = parseInt(expirationTag[1]);
        if (Date.now() / 1000 > expiresAt) {
          return false; // Expired
        }
      }

      return true;
    } catch (error) {
      console.error("Error validating invite code:", error);
      return false;
    }
  };
}

export function useRevokeInviteCode(group: Group) {
  const ndk = useNDK();
  const relaySet = useRelaySet([group.relay]);
  return async (code: string): Promise<NostrEvent> => {
    const event = new NDKEvent(ndk, {
      kind: 5 as NDKKind, // deletion event
      content: `Revoked invite code: ${code}`,
      tags: [
        ["h", group.id],
        ["code", code],
      ],
    } as NostrEvent);
    await event.publish(relaySet);
    return event.rawEvent() as NostrEvent;
  };
}

export function useGroupInviteCodes(group: Group) {
  const inviteEvents = useStream(
    {
      kinds: [9009 as NDKKind],
      "#h": [group.id],
    },
    [group.relay],
  );

  const deletionEvents = useStream(
    {
      kinds: [5 as NDKKind], // deletion events
      "#h": [group.id],
    },
    [group.relay],
  );

  // Get codes that have been deleted
  const deletedCodes = useMemo(() => {
    return deletionEvents.events
      .map((event) => {
        const codeTag = event.tags.find((t) => t[0] === "code");
        return codeTag ? codeTag[1] : null;
      })
      .filter(Boolean);
  }, [deletionEvents.events]);

  // Filter and process invite codes
  const inviteCodes = useMemo(() => {
    return inviteEvents.events
      .map((event) => {
        const codeTag = event.tags.find((t) => t[0] === "code");
        const code = codeTag ? codeTag[1] : null;
        const expirationTag = event.tags.find((t) => t[0] === "expiration");
        const expiresAt = expirationTag
          ? parseInt(expirationTag[1])
          : undefined;
        const isExpired = expiresAt ? Date.now() / 1000 > expiresAt : false;

        return {
          code,
          createdAt: event.created_at,
          expiresAt,
          isExpired,
          pubkey: event.pubkey,
        } as GroupInviteCode;
      })
      .filter((invite) => invite.code && !deletedCodes.includes(invite.code)) // Filter out deleted codes
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)); // Sort by newest first
  }, [inviteEvents.events, deletedCodes]);

  return { data: inviteCodes };
}

// Admin management functions following NIP-29

export function useAddAdmin(group: Group) {
  const ndk = useNDK();
  const relaySet = useRelaySet([group.relay]);
  return async (
    pubkey: string,
    role: string = "admin",
  ): Promise<NostrEvent> => {
    const event = new NDKEvent(ndk, {
      kind: 9000 as NDKKind, // put-user moderation event
      content: "",
      tags: [
        ["h", group.id],
        ["p", pubkey, role],
      ],
    } as NostrEvent);
    await event.publish(relaySet);
    queryClient.invalidateQueries({
      queryKey: [GROUP_ADMINS, group.id, group.relay],
    });
    return event.rawEvent() as NostrEvent;
  };
}

export function useRemoveAdmin(group: Group) {
  const ndk = useNDK();
  const relaySet = useRelaySet([group.relay]);
  return async (pubkey: string): Promise<NostrEvent> => {
    const event = new NDKEvent(ndk, {
      kind: 9001 as NDKKind, // remove-user moderation event
      content: "",
      tags: [
        ["h", group.id],
        ["p", pubkey],
      ],
    } as NostrEvent);
    await event.publish(relaySet);
    queryClient.invalidateQueries({
      queryKey: [GROUP_ADMINS, group.id, group.relay],
    });
    return event.rawEvent() as NostrEvent;
  };
}

export function useGroupName(group: Group) {
  const { id, relay } = group;
  const { data: metadata } = useGroup({ id, relay });
  const { data: relayInfo } = useRelayInfo(relay);
  const isRelayGroup = id === "_";
  return isRelayGroup ? relayInfo?.name : metadata?.name;
}

export function useGroupPicture(group: Group) {
  const { id, relay } = group;
  const { data: metadata } = useGroup({ id, relay });
  const { data: relayInfo } = useRelayInfo(relay);
  const isRelayGroup = id === "_";
  return isRelayGroup ? relayInfo?.icon : metadata?.picture;
}

export function useGroupDescription(group: Group) {
  const { id, relay } = group;
  const { data: metadata } = useGroup({ id, relay });
  const { data: relayInfo } = useRelayInfo(relay);
  const isRelayGroup = id === "_";
  return isRelayGroup ? relayInfo?.description : metadata?.about;
}

export function useGroupRoles(group: Group) {
  const ndk = useNDK();
  return useQuery({
    queryKey: [GROUP_ROLES, group.id, group.relay],
    queryFn: async () => {
      const roles = await fetchGroupRoles(ndk, group);
      return roles;
    },
    staleTime: Infinity,
    gcTime: 0,
  });
}

export async function fetchGroupRoles(
  ndk: NDK,
  group: Group,
): Promise<GroupRole[]> {
  try {
    const rolesEvent = await ndk.fetchEvent(
      {
        kinds: [39003 as NDKKind], // NIP-29 group roles event kind
        "#d": [group.id],
      },
      {
        closeOnEose: true,
        cacheUsage: NDKSubscriptionCacheUsage.CACHE_FIRST,
      },
      NDKRelaySet.fromRelayUrls([group.relay], ndk),
    );

    if (!rolesEvent) {
      return [];
    }

    const roles: GroupRole[] = rolesEvent.tags
      .filter((tag) => tag[0] === "role")
      .map((tag) => ({
        name: tag[1] || "",
        description: tag[2] || undefined,
      }))
      .filter((role) => role.name); // Filter out roles without names

    return roles;
  } catch (error) {
    console.error("Error fetching group roles:", error);
    return [];
  }
}

export async function fetchCommunity(ndk: NDK, pubkey: string) {
  const relays = await fetchRelayList(ndk, pubkey);
  const info = await fetchLatest(
    ndk,
    {
      kinds: [COMMUNIKEY],
      authors: [pubkey],
    },
    NDKRelaySet.fromRelayUrls(relays.concat(discoveryRelays), ndk),
  );
  if (!info) throw new Error("Can't find community metadata");
  const communityRelays = info.tags
    .filter((t) => t[0] === "r")
    .map((t) => t[1]);
  const [firstRelay, ...backupRelays] = communityRelays;
  if (!firstRelay) throw new Error("Invalid community metadata");
  const sections = info.tags.reduce((acc, t) => {
    const last = acc.at(-1);
    const [tag, value] = t;
    if (tag === "content") {
      acc.push({ name: value, kinds: [] });
    } else if (tag === "k" && last) {
      last.kinds.push(Number(value));
    } else if (tag === "fee" && last) {
      last.fee = Number(value);
    }
    return acc;
  }, [] as ContentSection[]);
  return {
    pubkey,
    relay: firstRelay!,
    backupRelays,
    blossom: info.tags.filter((t) => t[0] === "blossom").map((t) => t[1]),
    mint: info.tags.find((t) => t[0] === "mint")?.[1],
    sections,
    description: info.tagValue("description"),
    location: info.tagValue("location"),
    geohash: info.tagValue("g"),
  } as Community;
}

export function useCommunity(pubkey: string) {
  const ndk = useNDK();
  useEffect(() => {
    const getCommunity = async () => {
      const c = await fetchCommunity(ndk, pubkey);
      saveCommunity(c);
    };
    getCommunity();
  }, [pubkey]);

  return useLiveQuery(() => getCommunity(pubkey), [pubkey]);
}

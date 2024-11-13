import { useAtomValue } from "jotai";
import { useQuery, useQueries } from "@tanstack/react-query";
import NDK, {
  NDKEvent,
  NDKRelaySet,
  NDKKind,
  NDKSubscriptionCacheUsage,
} from "@nostr-dev-kit/ndk";
import { NostrEvent } from "nostr-tools";
import { followsAtom } from "@/app/store";
import { useNDK } from "@/lib/ndk";
import { useRelays, useRelaySet, useStream } from "@/lib/nostr";
import { nip29Relays, isRelayURL } from "@/lib/relay";
import { useAccount } from "@/lib/account";
import { useRelayInfo } from "@/lib/relay";
import type { Group, GroupMembers, GroupMetadata } from "@/lib/types";
import {
  queryClient,
  GROUPS,
  USER_GROUPS,
  CLOSE_GROUPS,
  GROUP_METADATA,
  GROUP_MEMBERS,
  GROUP_ADMINS,
} from "@/lib/query";

export function useUserGroups(pubkey: string) {
  const ndk = useNDK();
  const userRelays = useRelays();
  const relaySet = useRelaySet(userRelays);
  return useQuery({
    enabled: !!userRelays?.length,
    queryKey: [USER_GROUPS, pubkey],
    queryFn: async () => {
      const groupList = await ndk.fetchEvent(
        {
          kinds: [NDKKind.SimpleGroupList],
          authors: [pubkey],
        },
        {
          closeOnEose: true,
        },
        relaySet,
      );
      // todo: doesn't handle relay groups
      return (
        groupList?.tags
          .filter(
            (t) =>
              t[0] === "group" &&
              t[1] &&
              t[1] !== "_" &&
              t[2] &&
              isRelayURL(t[2]),
          )
          .map((t) => ({ id: t[1], relay: t[2] }) as Group) ?? []
      );
    },
    staleTime: Infinity,
    gcTime: 1 * 60 * 1000,
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
  } as GroupMetadata;
}

async function fetchGroupMetadata(ndk: NDK, group: Group) {
  // todo: group.id === "_"
  return ndk
    .fetchEvent(
      { kinds: [NDKKind.GroupMetadata], "#d": [group.id] },
      undefined, //{ cacheUsage: NDKSubscriptionCacheUsage.CACHE_FIRST },
      NDKRelaySet.fromRelayUrls([group.relay], ndk),
    )
    .then((ev: NDKEvent | null) => {
      if (!ev) throw new Error("Can't find group metadata");
      return {
        id: group.id,
        relay: group.relay,
        name: ev.tagValue("name") || "",
        about: ev.tagValue("about"),
        picture: ev.tagValue("picture"),
        visibility: ev.tags.find((t) => t[0] === "private")
          ? "private"
          : "public",
        access: ev.tags.find((t) => t[0] === "closed") ? "closed" : "open",
      } as GroupMetadata;
    });
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

export function useGroup(group: Group) {
  const { id, relay } = group;
  const ndk = useNDK();
  return useQuery({
    queryKey: [GROUP_METADATA, id, relay],
    queryFn: () => fetchGroupMetadata(ndk, group),
    staleTime: Infinity,
  });
}

export function useGroups(groups: Group[]) {
  const ndk = useNDK();
  return useQueries({
    queries: groups.map((group) => ({
      queryKey: [GROUP_METADATA, group.id, group.relay],
      queryFn: () => fetchGroupMetadata(ndk, group),
      staleTime: Infinity,
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

export function useGroupAdminsList(group: Group) {
  const ndk = useNDK();
  const relaySet = useRelaySet([group.relay]);
  return useQuery({
    queryKey: ["admin-list", group.id, group.relay],
    queryFn: async () => {
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
  const { data: members, isSuccess: membersFetched } = useGroupMembers(group);
  const { data: admins, isSuccess: adminsFetched } = useGroupAdmins(group);
  return {
    isSuccess: membersFetched && adminsFetched,
    admins: admins?.pubkeys || [],
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
        { closeOnEose: true, cacheUsage: NDKSubscriptionCacheUsage.PARALLEL },
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
    gcTime: 1 * 60 * 1000,
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
    const access = new NDKEvent(ndk, {
      kind: NDKKind.GroupAdminEditStatus,
      content: "",
      tags: [["h", id], [metadata.visibility], [metadata.access]],
    } as NostrEvent);
    await access.publish(relaySet);
    const edit = new NDKEvent(ndk, {
      kind: NDKKind.GroupAdminEditMetadata,
      content: "",
      tags: [["h", id]],
    } as NostrEvent);
    if (metadata.name) edit.tags.push(["name", metadata.name]);
    if (metadata.about) edit.tags.push(["about", metadata.about]);
    if (metadata.picture) edit.tags.push(["picture", metadata.picture]);
    await edit.publish(relaySet);
    queryClient.invalidateQueries({ queryKey: [GROUP_METADATA, id, relay] });
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
  return async () => {
    const event = new NDKEvent(ndk, {
      kind: NDKKind.GroupAdminRequestJoin,
      content: "",
      tags: [["h", group.id]],
    } as NostrEvent);
    await event.publish(relaySet);
    return event.rawEvent() as NostrEvent;
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

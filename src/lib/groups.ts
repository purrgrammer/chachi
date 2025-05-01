import { useAtomValue } from "jotai";
import { useNavigate } from "@/lib/navigation";
import { getRelayHost } from "@/lib/relay";
import { groupsAtom } from "@/app/store";
import type { Group } from "@/lib/types";

export function groupId(group: Group) {
  if (group.isCommunity) {
    return group.id;
  }
  return `${getRelayHost(group.relay)}'${group.id}`;
}

export function groupURL(group: Group) {
  if (group.isCommunity) {
    return `/c/${group.id}`;
  } else if (group.id === "_") {
    return `/${getRelayHost(group.relay)}`;
  } else {
    return `/${getRelayHost(group.relay)}/${group.id}`;
  }
}

export function useMyGroups() {
  return useAtomValue(groupsAtom);
}

export function useOpenGroup(group: Group) {
  const navigate = useNavigate();
  return () => {
    if (group.isCommunity) {
      navigate(`/c/${group.id}`);
    } else if (group.id === "_") {
      navigate(`/${getRelayHost(group.relay)}`);
    } else {
      navigate(`/${getRelayHost(group.relay)}/${group.id}`);
    }
  };
}
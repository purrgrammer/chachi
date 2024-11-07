import { useAtomValue } from "jotai";
import { useNavigate } from "@/lib/navigation";
import { getRelayHost } from "@/lib/relay";
import { groupsAtom } from "@/app/store";
import type { Group } from "@/lib/types";

export function groupId(group: Group) {
  return `${getRelayHost(group.relay)}'${group.id}`;
}

export function useMyGroups() {
  return useAtomValue(groupsAtom);
}

export function useOpenGroup(group: Group) {
  const navigate = useNavigate();
  return () => {
    if (group.id === "_") {
      navigate(`/${getRelayHost(group.relay)}`);
    } else {
      navigate(`/${getRelayHost(group.relay)}/${group.id}`);
    }
  };
}

import { useQuery } from "@tanstack/react-query";
import NDK, {
  NDKEvent,
  NDKKind,
  NDKRelaySet,
  NostrEvent,
} from "@nostr-dev-kit/ndk";
import { useNDK } from "@/lib/ndk";
import { useRelayList } from "@/lib/nostr";

async function fetchUserStatus(ndk: NDK, pubkey: string, relays: string[]) {
  const events = await ndk.fetchEvents(
    {
      kinds: [30315 as NDKKind],
      //todo: chat status
      //"#d": ["music"],
      authors: [pubkey],
    },
    { closeOnEose: true },
    NDKRelaySet.fromRelayUrls(relays, ndk),
  );
  const status = Array.from(events).reduce(
    (acc: NostrEvent | null, ev: NDKEvent) => {
      if (ev.created_at && ev.created_at > (acc?.created_at || 0)) {
        return ev.rawEvent() as unknown as NostrEvent;
      }
      return acc;
    },
    null,
  );
  const expiration = status?.tags.find((t) => t[0] === "expiration")?.[1];
  if (expiration && parseInt(expiration) < Date.now()) {
    return status;
  }
  return null;
}

export function useUserStatus(pubkey: string) {
  const ndk = useNDK();
  const { data: relayList } = useRelayList(pubkey);
  return useQuery({
    enabled: !!relayList,
    queryKey: ["user-status", pubkey],
    queryFn: () => fetchUserStatus(ndk, pubkey, relayList || []),
  });
}

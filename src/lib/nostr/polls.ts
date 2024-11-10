import { NostrEvent } from "nostr-tools";
import { NDKEvent } from "@nostr-dev-kit/ndk";
import { useRelaySet, useStream } from "@/lib/nostr";
import { useNDK } from "@/lib/ndk";
import { isRelayURL } from "@/lib/relay";
import { POLL_VOTE } from "@/lib/kinds";

export function useVotes(event: NostrEvent): NostrEvent[] {
  const relays = event.tags.filter((t) => t[0] === "relay").map((t) => t[1]);
  const pollType =
    event.tags.find((t) => t[0] === "polltype")?.[1] || "singlechoice";
  const endsAt = event.tags.find((t) => t[0] === "endsAt")?.[1];
  const isExpired = endsAt ? Date.now() > Number(endsAt) : false;
  const filter = {
    kinds: [POLL_VOTE],
    "#e": [event.id],
    ...(endsAt ? { until: Number(endsAt) } : {}),
  };
  const { events: votes } = useStream(filter, relays, !isExpired, true);
  // todo: if multiplechoice, only pick latest per pubkey per option
  return votes
    ? Array.from(
        votes
          .reduce((map, vote) => {
            if (
              (pollType === "singlechoice" && !map.has(vote.pubkey)) ||
              vote.created_at > map.get(vote.pubkey)!.created_at
            ) {
              map.set(vote.pubkey, vote);
            }
            return map;
          }, new Map<string, NostrEvent>())
          .values(),
      )
    : [];

  return votes || [];
}

export function useVote(event: NostrEvent, options: string[]) {
  const ndk = useNDK();
  const relays = event.tags
    .filter((t) => t[0] === "relay" && isRelayURL(t[1]))
    .map((t) => t[1])
    .slice(0, 5); // avoid having to connect to too many relays to respond a poll
  const relaySet = useRelaySet(relays);
  // todo: PoW
  return async (): Promise<NostrEvent> => {
    const ndkEvent = new NDKEvent(ndk, event);
    const vote = new NDKEvent(ndk, {
      kind: POLL_VOTE,
      tags: [["e", event.id], ...[...options].map((o) => ["response", o])],
      content: "",
    } as NostrEvent);
    vote.tag(ndkEvent);
    await vote.publish(relaySet);
    return vote.rawEvent() as NostrEvent;
  };
}

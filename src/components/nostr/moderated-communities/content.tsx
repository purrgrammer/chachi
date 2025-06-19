import type { NostrEvent } from "nostr-tools";
import { useEffect, useState } from "react";
import { Embed } from "@/components/nostr/detail";
import { NDKKind, NDKSubscriptionCacheUsage } from "@nostr-dev-kit/ndk";
import { useRelaySet } from "@/lib/nostr";
import { useNDK } from "@/lib/ndk";
import { POST_APPROVAL, MODERATED_COMMUNITY } from "@/lib/kinds";

type ModeratedCommunity = {
  pubkey: string;
  id: string;
  moderators: string[];
  relays: string[];
};

function useApprovedPosts(community: ModeratedCommunity) {
  const ndk = useNDK();
  const [posts, setPosts] = useState<NostrEvent[]>([]);
  const postKinds = [
    String(NDKKind.Text),
    String(NDKKind.Article),
    String(NDKKind.GroupNote),
  ];
  const relaySet = useRelaySet(community.relays);
  const fetchOptions = {
    cacheUsage: NDKSubscriptionCacheUsage.ONLY_RELAY,
  };

  useEffect(() => {
    const filter = {
      kinds: [POST_APPROVAL],
      "#k": postKinds,
      authors: community.moderators,
    };
    ndk.fetchEvents(filter, fetchOptions, relaySet).then((events) => {
      const ids = Array.from(events)
        .map((e) => e.tags.find((t) => t[0] === "e")?.[1])
        .filter(Boolean) as string[];
      const aRefs = Array.from(events)
        .map((e) => e.tags.find((t) => t[0] === "a")?.[1])
        .filter((a) => a && !a.startsWith(`${MODERATED_COMMUNITY}:`))
        .filter(Boolean) as string[];
      return ndk
        .fetchEvents(
          [
            // moderator's posts
            {
              kinds: [NDKKind.Text, NDKKind.Article, NDKKind.GroupNote],
              "#a": [
                `${MODERATED_COMMUNITY}:${community.pubkey}:${community.id}`,
              ],
              authors: community.moderators,
            },
            // approved posts
            { ids },
            ...aRefs.map((aRef) => {
              const [kind, pubkey, id] = aRef.split(":");
              return {
                kinds: [Number(kind)],
                authors: [pubkey],
                "#d": [id],
              };
            }),
          ],
          fetchOptions,
          relaySet,
        )
        .then((events) => {
          setPosts(Array.from(events).map((e) => e.rawEvent() as NostrEvent));
        });
    });
  }, [community.id, community.pubkey]);

  return posts;
}

export function ModeratedCommunitiesContent({ event }: { event: NostrEvent }) {
  const moderators = event.tags.filter((t) => t[0] === "p").map((t) => t[1]);
  const relays = event.tags.filter((t) => t[0] === "relay").map((t) => t[1]);

  const approvedPosts = useApprovedPosts({
    pubkey: event.pubkey,
    id: event.tags.find((t) => t[0] === "d")?.[1] || event.id,
    moderators,
    relays,
  });

  return (
    <div className="flex flex-col items-center justify-center gap-1 w-full">
      {approvedPosts.map((post) => (
        <Embed key={post.id} event={post} relays={relays} />
      ))}
    </div>
  );
}

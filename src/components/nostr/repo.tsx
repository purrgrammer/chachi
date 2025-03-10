import { Code, Link } from "lucide-react";
import { NostrEvent } from "nostr-tools";
//import { Button } from "@/components/ui/button";
import { NameList } from "@/components/nostr/name-list";
import Feed from "@/components/nostr/feed";
import { InputCopy } from "@/components/ui/input-copy";
import { REPO, ISSUE } from "@/lib/kinds";
import type { Group } from "@/lib/types";

export function Repo({ event }: { event: NostrEvent; group?: Group }) {
  const name = event.tags.find((t) => t[0] === "name")?.[1];
  const description = event.tags.find((t) => t[0] === "description")?.[1];
  const clone = event.tags.find((t) => t[0] === "clone")?.[1];
  const web = event.tags.find((t) => t[0] === "web")?.[1];
  const maintainers =
    event.tags.find((t) => t[0] === "maintainers")?.slice(1) || [];
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-4 px-8">
      <div className="flex flex-col items-center justify-center gap-2">
        <span className="text-6xl">📁</span>
        <h2 className="text-xl font-semibold line-clamp-1">{name}</h2>
        {description ? (
          <p className="text-sm text-muted-foreground text-center">
            {description}
          </p>
        ) : null}
      </div>
      <div className="flex flex-col items-center justify-center gap-2">
        {clone ? (
          <div className="flex flex-row items-center gap-2">
            <Code className="size-3" />
            <InputCopy value={clone} />
          </div>
        ) : null}
        {web ? (
          <div className="flex flex-row items-center gap-2">
            <Link className="size-3" />
            <a
              href={web}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm underline decoration-dotted"
            >
              {web}
            </a>
          </div>
        ) : null}
      </div>
      {maintainers?.length > 0 ? (
        <NameList
          pubkeys={maintainers as string[]}
          className="gap-1"
          avatarClassName="size-6"
          textClassName="font-normal text-sm"
        />
      ) : null}
    </div>
  );
}

export function Issues({
  event,
  group,
  relays,
}: {
  event: NostrEvent;
  group?: Group;
  relays: string[];
}) {
  const identifier = event.tags.find((t) => t[0] === "d")?.[1] || "";
  const repoRelays = event.tags.find((t) => t[0] === "relays")?.slice(1);
  const maintainers = event.tags
    .find((t) => t[0] === "maintainers")
    ?.slice(1) || [event.pubkey];
  const filter = {
    kinds: [ISSUE],
    "#a": maintainers.map((p) => `${REPO}:${p}:${identifier}`),
  };
  // todo: new post
  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <Feed
        className="w-full"
        filter={filter}
        group={group}
        outboxRelays={
          repoRelays?.length && repoRelays?.length > 0 ? repoRelays : relays
        }
      />
    </div>
  );
}

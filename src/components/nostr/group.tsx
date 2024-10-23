import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useGroup, useGroupParticipants } from "@/lib/nostr/groups";
import { AvatarList } from "@/components/nostr/avatar-list";
import { getRelayHost } from "@/lib/relay";
import { Name } from "@/components/nostr/name";
import type { Group } from "@/lib/types";
import { useNavigate } from "@/lib/navigation";

function Names({ pubkeys }: { pubkeys: string[] }) {
  if (pubkeys.length === 1) {
    return (
      <span className="font-semibold">
        <Name pubkey={pubkeys[0]} />
      </span>
    );
  }
  return pubkeys.map((pubkey, idx) => (
    <>
      <span className="font-semibold">
        <Name key={pubkey} pubkey={pubkey} />
      </span>
      {idx === pubkeys.length - 2 ? (
        <span> and </span>
      ) : idx >= 0 && idx < pubkeys.length - 1 ? (
        <span>, </span>
      ) : null}
    </>
  ));
}

export function Group({ group }: { group: Group }) {
  const navigate = useNavigate();
  const { data: metadata } = useGroup(group);
  const { admins, members } = useGroupParticipants(group);
  return (
    <div className="border rounded-md w-[320px]">
      {admins && admins.length > 0 ? (
        <div className="bg-accent px-2 py-1 rounded-t-md text-sm">
          Hosted by <Names pubkeys={admins || []} />
        </div>
      ) : null}
      <div className="flex flex-col gap-3 border-b p-3">
        <div className="flex flex-row items-center gap-3">
          <Avatar className="size-12">
            <AvatarImage src={metadata?.picture} className="object-cover" />
            <AvatarFallback>
              {metadata?.name?.slice(0, 1) || group.id.slice(0, 1)}
            </AvatarFallback>
          </Avatar>
          <h3 className="text-lg line-clamp-1">
            {metadata?.name || group.id.slice(0, 8)}
          </h3>
        </div>
        {metadata?.about ? (
          <span className="text-sm text-muted-foreground line-clamp-2">
            {metadata.about}
          </span>
        ) : null}
      </div>
      <div className="w-full flex items-center justify-between p-2">
        {members ? <AvatarList size="md" pubkeys={members} /> : null}
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(`/${getRelayHost(group.relay)}/${group.id}`)}
        >
          Visit
        </Button>
      </div>
    </div>
  );
}

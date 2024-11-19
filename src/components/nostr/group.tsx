import { MessagesSquare } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  useGroupName,
  useGroupPicture,
  useGroupDescription,
  useGroupParticipants,
} from "@/lib/nostr/groups";
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
    <div key={pubkey}>
      <span className="font-semibold">
        <Name key={pubkey} pubkey={pubkey} />
      </span>
      {idx === pubkeys.length - 2 ? (
        <span> and </span>
      ) : idx >= 0 && idx < pubkeys.length - 1 ? (
        <span>, </span>
      ) : null}
    </div>
  ));
}

export function Group({ group }: { group: Group }) {
  const navigate = useNavigate();
  const name = useGroupName(group);
  const picture = useGroupPicture(group);
  const description = useGroupDescription(group);
  const { admins, members } = useGroupParticipants(group);
  return (
    <div className="border rounded-md w-[320px]">
      {admins && admins.length > 0 ? (
        <div className="flex flex-row items-center flex-wrap gap-1 bg-accent px-2 py-1 rounded-t-md text-sm">
          Hosted by <Names pubkeys={admins || []} />
        </div>
      ) : null}
      <div className="flex flex-col gap-3 border-b p-3">
        <div className="flex flex-row items-center gap-3">
          <Avatar className="size-12">
            <AvatarImage src={picture} className="object-cover" />
            <AvatarFallback>
              {name?.slice(0, 1) || group.id.slice(0, 1)}
            </AvatarFallback>
          </Avatar>
          <h3 className="text-lg line-clamp-1">
            {name || group.id.slice(0, 8)}
          </h3>
        </div>
        {description ? (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {description}
          </p>
        ) : null}
      </div>
      <div className="w-full flex items-center justify-between p-2">
        {members ? <AvatarList size="md" pubkeys={members} /> : null}
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(`/${getRelayHost(group.relay)}/${group.id}`)}
        >
          <MessagesSquare /> Join
        </Button>
      </div>
    </div>
  );
}

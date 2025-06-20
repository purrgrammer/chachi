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
import { useTranslation } from "react-i18next";

function Names({ pubkeys }: { pubkeys: string[] }) {
  const { t } = useTranslation();
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
        <span>{t("group.hosted.and")}</span>
      ) : idx >= 0 && idx < pubkeys.length - 1 ? (
        <span>, </span>
      ) : null}
    </div>
  ));
}

export function Group({
  group,
  className,
}: {
  group: Group;
  className?: string;
}) {
  const navigate = useNavigate();
  const name = useGroupName(group);
  const picture = useGroupPicture(group);
  const description = useGroupDescription(group);
  const { admins, members } = useGroupParticipants(group);
  const { t } = useTranslation();
  return (
    <div className={`rounded-md border w-full min-w-0 ${className || ""}`}>
      {admins && admins.length > 0 ? (
        <div className="flex flex-row flex-wrap gap-1 items-center py-1 px-2 text-sm rounded-t-md bg-accent">
          {t("group.hosted.by")}
          <Names pubkeys={admins || []} />
        </div>
      ) : null}
      <div className="flex flex-col gap-3 p-3 border-b">
        <div className="flex flex-row gap-3 items-center">
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
      <div className="flex justify-between items-center p-2 w-full">
        {members ? <AvatarList size="md" pubkeys={members} /> : null}
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(`/${getRelayHost(group.relay)}/${group.id}`)}
        >
          <MessagesSquare /> {t("group.join")}
        </Button>
      </div>
    </div>
  );
}

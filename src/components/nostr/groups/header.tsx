import { Link } from "react-router-dom";
import { BookLock, BookOpen, Shield, ShieldOff } from "lucide-react";
import { useGroup, useGroupParticipants } from "@/lib/nostr/groups";
import { GroupInfo } from "@/components/nostr/groups/info";
import { BookmarkGroup } from "@/components/nostr/groups/bookmark";
import { EditGroup } from "@/components/nostr/groups/edit";
import { Separator } from "@/components/ui/separator";
import { Header } from "@/components/header";
import { usePubkey } from "@/lib/account";
import { useRelayInfo, getRelayHost } from "@/lib/relay";
import { groupId } from "@/lib/groups";
import { JoinRequests } from "@/components/nostr/groups/join-requests";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Group } from "@/lib/types";

// todo: tooltip for visiblity/access
function RelayName({ relay }: { relay: string }) {
  const { data: metadata } = useRelayInfo(relay);
  return metadata?.name;
}

export function GroupHeader({ group }: { group: Group }) {
  const { data: metadata } = useGroup(group);
  const { admins } = useGroupParticipants(group);
  const pubkey = usePubkey();
  const name = metadata?.name;
  const isRelayGroup = group.id === "_";

  return (
    <Header>
      <div className="flex flex-row items-center justify-between w-full">
        <div className="flex flex-row items-center justify-between w-full">
          <div className="">
            <h2 className="text-lg line-clamp-1">
              {isRelayGroup ? (
                <RelayName relay={group.relay} />
              ) : (
                <>{name || group.id.slice(0, 6)}</>
              )}
            </h2>
            {!isRelayGroup ? (
              <Link
                to={`/${getRelayHost(group.relay)}`}
                className="font-mono text-xs text-muted-foreground line-clamp-1 p-0"
              >
                {getRelayHost(group.relay)}
              </Link>
            ) : null}
          </div>
          {isRelayGroup ? null : (
            <div className="flex flex-row items-center gap-2">
              <div className="flex flex-row items-center gap-1">
                {metadata?.visibility === "private" ? (
                  <Tooltip>
                    <TooltipTrigger>
                      <div className="flex items-center gap-1.5">
                        <BookLock className="size-3 text-muted-foreground" />
                        <span className="text-xs hidden sm:block">
                          Members only
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      Only members can read content
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <Tooltip>
                    <TooltipTrigger>
                      <div className="flex items-center gap-1.5">
                        <BookOpen className="size-3 text-muted-foreground" />
                        <span className="text-xs hidden sm:block">Public</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>Can be read by anyone</TooltipContent>
                  </Tooltip>
                )}
              </div>
              <div className="flex flex-row items-center gap-1">
                {metadata?.access === "closed" ? (
                  <Tooltip>
                    <TooltipTrigger>
                      <div className="flex items-center gap-1.5">
                        <Shield className="size-3 text-muted-foreground" />
                        <span className="text-xs hidden sm:block">Closed</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      Requires approval or an invitation to join
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <Tooltip>
                    <TooltipTrigger>
                      <div className="flex items-center gap-1.5">
                        <ShieldOff className="size-3 text-muted-foreground" />
                        <span className="text-xs hidden sm:block">Open</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>Anyone can join</TooltipContent>
                  </Tooltip>
                )}
              </div>
            </div>
          )}
        </div>
        <div key={groupId(group)} className="flex flex-row items-center">
          {isRelayGroup ? null : (
            <Separator orientation="vertical" className="ml-3 h-4" />
          )}
          {!isRelayGroup && metadata?.access === "closed" ? (
            <JoinRequests group={group} />
          ) : null}
          {!isRelayGroup && metadata && pubkey && admins?.includes(pubkey) ? (
            <EditGroup group={metadata} />
          ) : null}
          <BookmarkGroup group={group} />
          {!isRelayGroup ? <GroupInfo group={group} /> : null}
        </div>
      </div>
    </Header>
  );
}

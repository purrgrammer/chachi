import {
  BookLock,
  Castle,
  PenOff,
  EyeOff,
  ShieldOff,
  Settings,
} from "lucide-react";
import { useGroup, useFetchGroupParticipants } from "@/lib/nostr/groups";
import { GroupInfo } from "@/components/nostr/groups/info";
import { BookmarkGroup } from "@/components/nostr/groups/bookmark";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/header";
import { usePubkey, useCanSign } from "@/lib/account";
import { groupId } from "@/lib/groups";
import { Link } from "react-router-dom";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Group } from "@/lib/types";
import { RelayName, RelayLink } from "@/components/nostr/relay";
import { useTranslation } from "react-i18next";

export function GroupHeader({ group }: { group: Group }) {
  const { data: metadata } = useGroup(group);
  const { data: participants } = useFetchGroupParticipants(group);
  const admins = participants?.admins || [];
  const pubkey = usePubkey();
  const canSign = useCanSign();
  const name = metadata?.name;
  const isRelayGroup = group.id === "_";
  const { t } = useTranslation();

  return (
    <Header>
      <div className="flex flex-row justify-between items-center w-full">
        <div className="flex flex-row justify-between items-center w-full">
          <div className="flex flex-row gap-2 items-center">
            {metadata?.picture ? (
              <img
                src={metadata.picture}
                className="size-6 sm:size-8 rounded-full"
              />
            ) : null}
            <div className="flex flex-col gap-0">
              <h2 className="text-lg line-clamp-1 leading-none">
                {isRelayGroup ? (
                  <RelayName relay={group.relay} />
                ) : (
                  <>{name || group.id.slice(0, 6)}</>
                )}
              </h2>
              <RelayLink
                relay={group.relay}
                classNames={{
                  icon: "size-3",
                  wrapper: "gap-1",
                  name: "text-xs text-muted-foreground line-clamp-1",
                }}
              />
            </div>
          </div>
          {isRelayGroup ? null : (
            <div className="flex flex-row gap-2 items-center">
              {metadata?.isCommunity ? (
                <Tooltip>
                  <TooltipTrigger>
                    <Castle className="size-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    {t("group.metadata.community")}
                  </TooltipContent>
                </Tooltip>
              ) : null}
              {/* Private marker - read access */}
              {metadata?.isPrivate ? (
                <Tooltip>
                  <TooltipTrigger>
                    <div className="flex gap-1.5 items-center">
                      <BookLock className="size-3 text-muted-foreground" />
                      <span className="hidden text-xs sm:block">
                        {t("group.metadata.private.trigger")}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    {t("group.metadata.private.content")}
                  </TooltipContent>
                </Tooltip>
              ) : null}
              {/* Restricted marker - write access */}
              {metadata?.isRestricted ? (
                <Tooltip>
                  <TooltipTrigger>
                    <div className="flex gap-1.5 items-center">
                      <PenOff className="size-3 text-muted-foreground" />
                      <span className="hidden text-xs sm:block">
                        {t("group.metadata.restricted.trigger")}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    {t("group.metadata.restricted.content")}
                  </TooltipContent>
                </Tooltip>
              ) : null}
              {/* Hidden marker - metadata visibility */}
              {metadata?.isHidden ? (
                <Tooltip>
                  <TooltipTrigger>
                    <div className="flex gap-1.5 items-center">
                      <EyeOff className="size-3 text-muted-foreground" />
                      <span className="hidden text-xs sm:block">
                        {t("group.metadata.hidden.trigger")}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    {t("group.metadata.hidden.content")}
                  </TooltipContent>
                </Tooltip>
              ) : null}
              {/* Closed marker - join requests */}
              {metadata?.isClosed ? (
                <Tooltip>
                  <TooltipTrigger>
                    <div className="flex gap-1.5 items-center">
                      <ShieldOff className="size-3 text-muted-foreground" />
                      <span className="hidden text-xs sm:block">
                        {t("group.metadata.closed.trigger")}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    {t("group.metadata.closed.content")}
                  </TooltipContent>
                </Tooltip>
              ) : null}
            </div>
          )}
        </div>
        <div key={groupId(group)} className="flex flex-row items-center">
          {isRelayGroup ? null : (
            <Separator orientation="vertical" className="ml-3 h-4" />
          )}
          {!isRelayGroup &&
          metadata &&
          pubkey &&
          admins?.includes(pubkey) &&
          canSign ? (
            <Link to={`/${new URL(group.relay).hostname}/${group.id}/settings`}>
              <Button aria-label="Group settings" variant="ghost" size="icon">
                <Settings className="size-6" />
              </Button>
            </Link>
          ) : null}
          <BookmarkGroup group={group} />
          {!isRelayGroup ? <GroupInfo group={group} /> : null}
        </div>
      </div>
    </Header>
  );
}

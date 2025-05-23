import { BookLock, BookOpen, Castle, Shield, ShieldOff } from "lucide-react";
import { useGroup, useGroupParticipants } from "@/lib/nostr/groups";
import { GroupInfo } from "@/components/nostr/groups/info";
import { BookmarkGroup } from "@/components/nostr/groups/bookmark";
import { EditGroup } from "@/components/nostr/groups/edit";
import { Separator } from "@/components/ui/separator";
import { Header } from "@/components/header";
import { usePubkey } from "@/lib/account";
import { groupId } from "@/lib/groups";
import { JoinRequests } from "@/components/nostr/groups/join-requests";
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
  const { admins } = useGroupParticipants(group);
  const pubkey = usePubkey();
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
              {!isRelayGroup ? (
                <RelayLink
                  relay={group.relay}
                  classNames={{
                    icon: "size-3",
                    wrapper: "gap-1",
                    name: "text-xs text-muted-foreground line-clamp-1",
                  }}
                />
              ) : null}
            </div>
          </div>
          {isRelayGroup ? null : (
            <div className="flex flex-row gap-2 items-center">
              <div className="flex flex-row gap-1 items-center">
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
                {metadata?.visibility === "private" ? (
                  <Tooltip>
                    <TooltipTrigger>
                      <div className="flex gap-1.5 items-center">
                        <BookLock className="size-3 text-muted-foreground" />
                        <span className="hidden text-xs sm:block">
                          {t("group.metadata.visibility.private.trigger")}
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      {t("group.metadata.visibility.private.content")}
                    </TooltipContent>
                  </Tooltip>
                ) : metadata?.visibility === "public" ? (
                  <Tooltip>
                    <TooltipTrigger>
                      <div className="flex gap-1.5 items-center">
                        <BookOpen className="size-3 text-muted-foreground" />
                        <span className="hidden text-xs sm:block">
                          {t("group.metadata.visibility.public.trigger")}
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      {t("group.metadata.visibility.public.content")}
                    </TooltipContent>
                  </Tooltip>
                ) : null}
              </div>
              <div className="flex flex-row gap-1 items-center">
                {metadata?.access === "closed" ? (
                  <Tooltip>
                    <TooltipTrigger>
                      <div className="flex gap-1.5 items-center">
                        <Shield className="size-3 text-muted-foreground" />
                        <span className="hidden text-xs sm:block">
                          {t("group.metadata.access.closed.trigger")}
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      {t("group.metadata.access.closed.content")}
                    </TooltipContent>
                  </Tooltip>
                ) : metadata?.access === "open" ? (
                  <Tooltip>
                    <TooltipTrigger>
                      <div className="flex gap-1.5 items-center">
                        <ShieldOff className="size-3 text-muted-foreground" />
                        <span className="hidden text-xs sm:block">
                          {t("group.metadata.access.open.trigger")}
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      {t("group.metadata.access.open.content")}
                    </TooltipContent>
                  </Tooltip>
                ) : null}
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

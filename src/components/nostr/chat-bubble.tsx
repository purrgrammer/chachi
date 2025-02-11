import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Forward } from "lucide-react";
import { NostrEvent } from "nostr-tools";
import { groupURL } from "@/lib/groups";
import { ChatMessage } from "@/components/nostr/chat/chat";
import { useGroup } from "@/lib/nostr/groups";
import { cn } from "@/lib/utils";
import type { Group } from "@/lib/types";

function GroupName({ group, className }: { group: Group; className?: string }) {
  const { data: metadata } = useGroup(group);
  return metadata ? (
    <Link
      to={groupURL(group)}
      className={cn(
        "text-sm hover:cursor-pointer hover:underline hover:decoration-dotted",
        className,
      )}
    >
      <div className="flex flex-row items-center gap-1">
        {metadata.picture ? (
          <img src={metadata.picture} className="size-3 rounded-full" />
        ) : null}
        <span>{metadata.name}</span>
      </div>
    </Link>
  ) : null;
}

interface ChatBubbleProps {
  event: NostrEvent;
  group?: Group;
}

export function ChatBubble({ event, group }: ChatBubbleProps) {
  const { t } = useTranslation();
  const groupTag = event.tags.find((t) => t[0] === "h");
  const [, id, relay] = groupTag ? groupTag : [];
  const chatGroup = { id, relay };
  const isForwarded =
    chatGroup.id &&
    chatGroup.relay &&
    group &&
    (group.id !== chatGroup.id || group.relay !== chatGroup.relay);
  return (
    <div className="flex flex-col gap-0.5">
      {isForwarded ? (
        <div className="flex flex-row gap-1 items-center text-muted-foreground">
          <Forward className="size-4" />
          <span className="text-xs">{t("chat.message.forward.forwarded")}</span>
          <GroupName group={chatGroup} className="text-xs" />
        </div>
      ) : null}
      <ChatMessage event={event} group={group} admins={[]} />
    </div>
  );
}

export function ChatBubbleDetail({ event }: ChatBubbleProps) {
  const { t } = useTranslation();
  const groupTag = event.tags.find((t) => t[0] === "h");
  const [, id, relay] = groupTag ? groupTag : [];
  const group = { id, relay };
  return (
    <div className="flex flex-col gap-0">
      {group.id && group.relay ? (
        <div className="flex flex-row gap-1 items-center text-muted-foreground ml-10">
          <Forward className="size-4" />
          <span className="text-sm">{t("chat.message.forward.forwarded")}</span>
          <GroupName group={group} />
        </div>
      ) : null}
      <ChatMessage event={event} group={group} admins={[]} />
    </div>
  );
}

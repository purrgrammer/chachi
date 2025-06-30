import { Reorder } from "framer-motion";
import { useAtomValue } from "jotai";
import { useParams } from "react-router-dom";
import { VenetianMask } from "lucide-react";
import { NostrEvent } from "nostr-tools";
import { Avatar as NostrAvatar } from "@/components/nostr/avatar";
import { useSortedGroups } from "@/lib/messages";
import { useTranslation } from "react-i18next";
import { groupId } from "@/lib/groups";
import { LazyRichText } from "@/components/lazy/LazyRichText";
import { Name } from "@/components/nostr/name";
import { CreateGroup } from "@/components/nostr/groups/create";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { SidebarMenu, SidebarMenuItem } from "@/components/ui/sidebar";
import { useMyGroups } from "@/lib/groups";
import { useGroup } from "@/lib/nostr/groups";
import { useRelayInfo, getRelayHost } from "@/lib/relay";
import { useNavigate } from "@/lib/navigation";
import {
  useLastMessage,
  useUnreadMessages,
  //useUnreadMentions,
} from "@/lib/messages";
import { usePrivateUnreadMessages } from "@/lib/nostr/dm";
import type { Group, Event } from "@/lib/types";
import { NDKKind } from "@nostr-dev-kit/ndk";
import { validateZap, Zap } from "@/lib/nip-57";
import { validateNutzap, Nutzap } from "@/lib/nip-61";
import { useMemo } from "react";
import Amount from "@/components/amount";
import { privateMessagesEnabledAtom } from "@/app/store";

interface MessageEvent {
  id: string;
  group: string;
  kind: number;
  created_at: number;
  content: string;
  pubkey: string;
  tags: string[][];
}

function PaymentPreview({ group, zap }: { group: Group; zap: Zap | Nutzap }) {
  return (
    <div className="flex flex-row items-start gap-1 text-xs line-clamp-1 text-muted-foreground">
      <span className="font-semibold">
        <Name pubkey={zap.pubkey} short />
      </span>
      {zap.content ? (
        <>
          <LazyRichText
            group={group}
            className="leading-none line-clamp-1"
            options={{
              inline: true,
              emojis: true,
              mentions: true,
              hashtags: true,
              events: false,
              ecash: false,
              codeBlock: false,
              syntax: false,
              images: false,
              video: false,
              audio: false,
              youtube: false,
            }}
            classNames={{
              emojis: "size-4 opacity-70",
              spans: "break-all",
              urls: "pointer-events-none",
              mentions: "pointer-events-none",
            }}
            tags={zap.tags}
          >
            {zap.content}
          </LazyRichText>
        </>
      ) : (
        <div className="flex flex-row items-center gap-1">
          <Amount amount={zap.amount} size="sm" />
          <span className="font-semibold">
            <Name pubkey={zap.p!} short />
          </span>
        </div>
      )}
    </div>
  );
}

function NutzapPreview({ group, event }: { group: Group; event: Event }) {
  const zap = useMemo(
    () => validateNutzap(event as unknown as NostrEvent),
    [event],
  );
  if (!zap) return null;
  return <PaymentPreview group={group} zap={zap} />;
}

function ZapPreview({ group, event }: { group: Group; event: Event }) {
  const zap = useMemo(
    () => validateZap(event as unknown as NostrEvent),
    [event],
  );
  if (!zap) return null;
  return <PaymentPreview group={group} zap={zap} />;
}

// todo: relationship
const LastMessagePreview = ({
  lastMessage,
  group,
}: {
  lastMessage: MessageEvent;
  group: Group;
}) => {
  const { t } = useTranslation();

  if (lastMessage.kind === NDKKind.GroupAdminAddUser) {
    const pubkey =
      lastMessage.tags.find((t) => t[0] === "p")?.[1] || lastMessage.pubkey;
    const role = lastMessage.tags.find((t) => t[0] === "p")?.[2];
    return (
      <div className="flex flex-row items-baseline text-xs line-clamp-1 gap-1 text-muted-foreground italic">
        <span className="font-semibold">
          <Name pubkey={pubkey} short />
        </span>
        {role ? (
          <span className="text-xs text-muted-foreground">
            {t("group.chat.user.admin", { role })}
          </span>
        ) : (
          <span className="text-muted-foreground">
            {t("group.chat.user.joined")}
          </span>
        )}
      </div>
    );
  }

  if (lastMessage.kind === NDKKind.GroupAdminRemoveUser) {
    const pubkey =
      lastMessage.tags.find((t) => t[0] === "p")?.[1] || lastMessage.pubkey;
    return (
      <div className="flex flex-row items-baseline text-xs line-clamp-1 gap-1 text-muted-foreground italic">
        <span className="font-semibold">
          <Name pubkey={pubkey} short />
        </span>
        <span className="text-muted-foreground">
          {t("group.chat.user.left")}
        </span>
      </div>
    );
  }

  if (lastMessage.kind === NDKKind.Zap) {
    return <ZapPreview group={group} event={lastMessage} />;
  }

  if (lastMessage.kind === NDKKind.Nutzap) {
    return <NutzapPreview group={group} event={lastMessage} />;
  }

  // todo: relationship

  return (
    <div className="flex flex-row items-baseline text-xs line-clamp-1 text-muted-foreground">
      <span className="font-semibold">
        <Name pubkey={lastMessage.pubkey} short />
      </span>
      <span className="mr-1">:</span>
      <LazyRichText
        group={group}
        className="leading-none line-clamp-1"
        options={{
          inline: true,
          emojis: true,
          mentions: true,
          hashtags: true,
          events: false,
          ecash: false,
          codeBlock: false,
          syntax: false,
          images: false,
          video: false,
          audio: false,
          youtube: false,
        }}
        classNames={{
          emojis: "size-4 opacity-70",
          spans: "break-all",
          urls: "pointer-events-none",
          mentions: "pointer-events-none",
        }}
        tags={lastMessage.tags}
      >
        {lastMessage.content}
      </LazyRichText>
    </div>
  );
};

function RelayItem({ group }: { group: Group }) {
  const { host } = useParams();
  const { data: relayInfo } = useRelayInfo(group.relay);
  const lastMessage = useLastMessage(group);
  const unreadMessages = useUnreadMessages(group);
  //const unreadMentions = useUnreadMentions(group);
  const isActive = host === getRelayHost(group.relay);
  const navigate = useNavigate();

  function openGroup() {
    navigate(`/${getRelayHost(group.relay)}`);
  }

  return (
    <div
      className={`flex items-center p-1 py-2 cursor-pointer transition-colors ${isActive ? "bg-accent/50" : "bg-background"} hover:bg-accent/80 overflow-hidden group-has-[[data-collapsible=icon]]/sidebar-wrapper:bg-transparent group-has-[[data-collapsible=icon]]/sidebar-wrapper:py-1 transition-all`}
      onClick={openGroup}
    >
      <div className="flex gap-2 items-center">
        <div
          className={`size-10 rounded-full ${isActive ? "group-has-[[data-collapsible=icon]]/sidebar-wrapper:ring-2 ring-primary ring-offset-1 ring-offset-background" : ""} relative`}
        >
          <Avatar className="rounded-full size-10 shrink-0">
            <AvatarImage src={relayInfo?.icon} className="object-cover" />
            <AvatarFallback>
              <img src={relayInfo?.icon} alt={relayInfo?.name} />
            </AvatarFallback>
          </Avatar>
        </div>
        <div
          className={`flex flex-row gap-1 absolute top-3 right-2 group-has-[[data-collapsible=icon]]/sidebar-wrapper:top-0 group-has-[[data-collapsible=icon]]/sidebar-wrapper:right-0`}
        >
          {unreadMessages && unreadMessages > 0 ? (
            <Badge variant="counter">
              <span className="font-mono text-xs font-light">
                {unreadMessages >= 100 ? "99+" : unreadMessages}
              </span>
            </Badge>
          ) : null}
        </div>
        <div className="flex flex-col">
          <h3 className="line-clamp-1">
            {relayInfo?.name || group.id.slice(0, 8)}
          </h3>
          {lastMessage ? (
            <LastMessagePreview lastMessage={lastMessage} group={group} />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function CommunityItem({ group }: { group: Group }) {
  const lastMessage = useLastMessage(group);
  const navigate = useNavigate();
  const { pubkey } = useParams();
  const unreadMessages = useUnreadMessages(group);
  //const unreadMentions = useUnreadMentions(group);
  const isActive = pubkey === group.id;

  function openGroup() {
    navigate(`/c/${group.id}`);
  }

  return (
    <div
      className={`flex items-center p-1 py-2 cursor-pointer transition-colors ${isActive ? "bg-accent/50" : "bg-background"} hover:bg-accent/80 overflow-hidden group-has-[[data-collapsible=icon]]/sidebar-wrapper:bg-transparent group-has-[[data-collapsible=icon]]/sidebar-wrapper:py-1 transition-all`}
      onClick={openGroup}
    >
      <div className="flex gap-2 items-center">
        <div
          className={`size-10 rounded-full ${isActive ? "group-has-[[data-collapsible=icon]]/sidebar-wrapper:ring-2 ring-primary ring-offset-1 ring-offset-background" : ""} relative`}
        >
          <NostrAvatar
            pubkey={group.id}
            className="rounded-full size-10 shrink-0"
          />
        </div>
        <div className="flex flex-row gap-1 absolute top-3 right-2 group-has-[[data-collapsible=icon]]/sidebar-wrapper:top-0 group-has-[[data-collapsible=icon]]/sidebar-wrapper:right-0">
          {unreadMessages && unreadMessages > 0 ? (
            <Badge variant="counter">
              <span className="font-mono text-xs font-light">
                {unreadMessages >= 100 ? "99+" : unreadMessages}
              </span>
            </Badge>
          ) : null}
        </div>
        <div className="flex flex-col">
          <h3 className="line-clamp-1">
            <Name pubkey={group.id} />
          </h3>
          {lastMessage ? (
            <LastMessagePreview lastMessage={lastMessage} group={group} />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function GroupItem({ group }: { group: Group }) {
  const lastMessage = useLastMessage(group);
  const navigate = useNavigate();
  const { host, id, pubkey } = useParams();
  const { data: metadata } = useGroup(group);
  const unreadMessages = useUnreadMessages(group);
  //const unreadMentions = useUnreadMentions(group);
  const isActive = host
    ? host === getRelayHost(group.relay) && id === group.id
    : pubkey === group.id;

  function openGroup() {
    if (group.isCommunity || metadata?.isCommunity) {
      navigate(`/c/${group.id}`);
    } else {
      navigate(`/${getRelayHost(group.relay)}/${group.id}`);
    }
  }

  return (
    <div
      className={`flex items-center p-1 py-2 cursor-pointer transition-colors ${isActive ? "bg-accent/50" : "bg-background"} hover:bg-accent/80 overflow-hidden group-has-[[data-collapsible=icon]]/sidebar-wrapper:bg-transparent group-has-[[data-collapsible=icon]]/sidebar-wrapper:py-1 transition-all`}
      onClick={openGroup}
    >
      <div className="flex gap-2 items-center">
        <div
          className={`size-10 rounded-full ${isActive ? "group-has-[[data-collapsible=icon]]/sidebar-wrapper:ring-2 ring-primary ring-offset-1 ring-offset-background" : ""} relative`}
        >
          <Avatar className="rounded-full size-10 shrink-0">
            <AvatarImage src={metadata?.picture} className="object-cover" />
            <AvatarFallback>
              {metadata?.name?.charAt(0) || group.id.charAt(0)}
            </AvatarFallback>
          </Avatar>
        </div>
        <div className="flex flex-row gap-1 absolute top-3 right-2 group-has-[[data-collapsible=icon]]/sidebar-wrapper:top-0 group-has-[[data-collapsible=icon]]/sidebar-wrapper:right-0">
          {unreadMessages && unreadMessages > 0 ? (
            <Badge variant="counter">
              <span className="font-mono text-xs font-light">
                {unreadMessages >= 100 ? "99+" : unreadMessages}
              </span>
            </Badge>
          ) : null}
        </div>
        <div className="flex flex-col">
          <h3 className="line-clamp-1">
            {metadata?.name || group.id.slice(0, 8)}
          </h3>
          {lastMessage ? (
            <LastMessagePreview lastMessage={lastMessage} group={group} />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function PrivateGroups() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const unreadMessages = usePrivateUnreadMessages();

  return (
    <div
      className={`flex flex-row gap-2 items-center p-1 py-2 cursor-pointer transition-colors hover:bg-accent/80 overflow-hidden group-has-[[data-collapsible=icon]]/sidebar-wrapper:bg-transparent group-has-[[data-collapsible=icon]]/sidebar-wrapper:py-1 transition-all relative`}
      onClick={() => navigate("/dm")}
    >
      <div className={`size-10 rounded-full relative`}>
        <VenetianMask className="size-10 text-muted-foreground" />
      </div>
      <div className="flex flex-row gap-2 items-center">
        <div className="flex flex-col">
          <h3 className="line-clamp-1">{t("private-group.private-groups")}</h3>
        </div>
        <div className="flex flex-row gap-1 absolute top-3 right-2 group-has-[[data-collapsible=icon]]/sidebar-wrapper:top-0 group-has-[[data-collapsible=icon]]/sidebar-wrapper:right-0">
          {unreadMessages && unreadMessages > 0 ? (
            <Badge variant="counter">
              <span className="font-mono text-xs font-light">
                {unreadMessages >= 100 ? "99+" : unreadMessages}
              </span>
            </Badge>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function MyGroupList() {
  const sortedGroups = useSortedGroups();
  const privateMessagesEnabled = useAtomValue(privateMessagesEnabledAtom);
  return (
    <SidebarMenu className="gap-0">
      {privateMessagesEnabled ? <PrivateGroups /> : null}
      <Reorder.Group
        axis="y"
        layoutScroll
        values={sortedGroups}
        onReorder={() => console.log("reorder")}
      >
        {sortedGroups.map((group) => (
          <Reorder.Item dragListener={false} key={groupId(group)} value={group}>
            <SidebarMenuItem>
              {group.id === "_" ? (
                <RelayItem group={group} />
              ) : group.isCommunity ? (
                <CommunityItem group={group} />
              ) : (
                <GroupItem group={group} />
              )}
            </SidebarMenuItem>
          </Reorder.Item>
        ))}
      </Reorder.Group>
      <CreateGroup className="group-has-[[data-collapsible=icon]]/sidebar-wrapper:hidden" />
    </SidebarMenu>
  );
}

export function NavGroups() {
  const myGroups = useMyGroups();
  const { t } = useTranslation();
  return myGroups.length > 0 ? (
    <MyGroupList />
  ) : (
    <div className="flex flex-col gap-2">
      <div className="flex justify-center items-center">
        <span className="group-has-[[data-collapsible=icon]]/sidebar-wrapper:hidden text-sm text-muted-foreground">
          {t("nav.no-groups")}
        </span>
      </div>
      <CreateGroup className="group-has-[[data-collapsible=icon]]/sidebar-wrapper:hidden" />
    </div>
  );
}

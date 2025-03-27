import { useState } from "react";
import { useTranslation } from "react-i18next";
import { RelayIcon } from "@/components/nostr/relay";
import { User } from "@/components/nostr/user";
import { NameList } from "@/components/nostr/name-list";
import { Route, RouteOff, MessageSquareLock } from "lucide-react";
import { NDKKind, NostrEvent } from "@nostr-dev-kit/ndk";
import { useParams } from "react-router-dom";
import { Avatar } from "@/components/nostr/avatar";
import { Header } from "@/components/header";
import {
  useGroupMessages,
  useDirectMessages,
  useGroupDirectMessages,
  useDirectMessageRelays,
  idToGroup,
} from "@/lib/nostr/dm";
import { ChatInput } from "@/components/nostr/chat/input-private";
import { Chat } from "@/components/nostr/chat/private";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PrivateGroup } from "@/lib/types";
import { usePubkey, useDMRelays } from "@/lib/account";

function GroupChat({ id, group }: { id: string; group: PrivateGroup }) {
  const messages = useGroupMessages(id);
  const [replyingTo, setReplyingTo] = useState<NostrEvent | undefined>(
    undefined,
  );
  const [inputHeight, setInputHeight] = useState(34);
  const headerHeight = 100;
  const nonChatHeight = inputHeight + headerHeight;
  return (
    <div className={`grid grid-col-[1fr_${inputHeight}px]"`}>
      <Chat
        group={group}
        //admins={admins}
        style={
          {
            height: `calc(100vh - ${nonChatHeight}px)`,
          } as React.CSSProperties
        }
        //newMessage={sentMessage}
        //lastSeen={lastSeen ? lastSeen : undefined}
        //deleteEvents={deleteEvents}
        replyingTo={replyingTo}
        setReplyingTo={setReplyingTo}
        //scrollTo={scrollTo}
        //setScrollTo={setScrollTo}
        // @ts-expect-error: these events are unsigned since they come from DB
        events={messages}
        //canDelete={canDelete}
        //deleteEvent={deleteEvent}
        messageKinds={[NDKKind.PrivateDirectMessage]}
        components={
          {
            //[NDKKind.Nutzap]: ({ event, ...props }) => (
            //  <ChatNutzap
            //    key={event.id}
            //    event={event}
            //    group={group}
            //    canDelete={canDelete}
            //    deleteEvent={deleteEvent}
            //    {...props}
            //  />
            //),
            //[NDKKind.GroupAdminAddUser]: (props) => (
            //  <UserActivity {...props} action="join" />
            //),
            //[NDKKind.GroupAdminRemoveUser]: (props) => (
            //  <UserActivity {...props} action="leave" />
            //),
          }
        }
        //setReplyingTo={setReplyingTo}
      />
      <ChatInput
        group={group}
        height={inputHeight}
        onHeightChange={(height) => {
          setInputHeight(height);
        }}
        kind={NDKKind.PrivateDirectMessage}
        replyKind={NDKKind.PrivateDirectMessage}
        //onNewMessage={onNewMessage}
        // @ts-expect-error: these events are unsigned since they come from DB
        replyingTo={replyingTo}
        setReplyingTo={setReplyingTo}
      />
    </div>
  );
}

function DirectMessageGroupPubkey({ pubkey }: { pubkey: string }) {
  const { data: relayList } = useDirectMessageRelays(pubkey);
  return (
    <UserRelays
      pubkey={pubkey}
      relays={
        relayList?.dm && relayList.dm.length > 0
          ? relayList.dm
          : relayList
            ? relayList.fallback
            : []
      }
      isCompliant={relayList?.dm && relayList.dm.length > 0}
    />
  );
}

function DirectMessageMultiGroup({ group }: { group: PrivateGroup }) {
  // todo: multi groups
  const { id } = group;
  const { t } = useTranslation();
  return (
    <>
      <Header>
        <div className="flex items-center justify-between w-full">
          <div className="flex flex-row items-center gap-2">
            <div className="flex flex-col gap-0">
              <span className="font-normal text-md line-clamp-1 leading-tight">
                <NameList pubkeys={group.pubkeys} />
              </span>
            </div>
          </div>
          <Tooltip>
            <TooltipTrigger>
              <div className="flex gap-1.5 items-center">
                <MessageSquareLock className="size-3 text-muted-foreground" />
                <span className="hidden text-xs line-clamp-1 sm:block">
                  {t("private-group.type.trigger")}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent>{t("private-group.type.content")}</TooltipContent>
          </Tooltip>
        </div>
      </Header>
      <div className="flex flex-row items-center gap-1.5 p-1 pl-4 border-b overflow-hidden">
        {group.pubkeys.map((p) => (
          <DirectMessageGroupPubkey key={p} pubkey={p} />
        ))}
      </div>
      <GroupChat id={id} group={group} />
    </>
  );
}

function UserRelays({
  pubkey,
  relays,
  isCompliant,
  empty = null,
}: {
  pubkey: string;
  relays: string[];
  empty?: React.ReactNode;
  isCompliant?: boolean;
}) {
  const { t } = useTranslation();
  const Icon = isCompliant ? Route : RouteOff;
  return (
    <div className="flex flex-row items-center gap-2 border p-1 rounded-full">
      <Tooltip>
        <TooltipTrigger>
          <Icon
            className={`size-4 ${isCompliant ? "text-green-300 dark:text-green-100" : "text-red-300 dark:text-red-100"}`}
          />
        </TooltipTrigger>
        <TooltipContent>
          {isCompliant
            ? t("private-group.compliant")
            : t("private-group.non-compliant")}
        </TooltipContent>
      </Tooltip>
      <Avatar pubkey={pubkey} className="size-4" />
      <div className="flex flex-row gap-1">
        {relays?.length > 0
          ? relays.map((relay) => <RelayIcon key={relay} relay={relay} />)
          : empty}
      </div>
    </div>
  );
}

function SingleGroup({ group, peer }: { group: PrivateGroup; peer: string }) {
  const { id } = group;
  const dmRelays = useDMRelays();
  const { t } = useTranslation();
  const pubkey = usePubkey();
  const { data: relayList } = useDirectMessageRelays(peer);
  return (
    <>
      <Header>
        <div className="flex items-center justify-between w-full">
          <User
            pubkey={peer}
            classNames={{
              avatar: "size-8",
              name: "font-normal text-md line-clamp-1 leading-tight",
            }}
          />
          <Tooltip>
            <TooltipTrigger>
              <div className="flex gap-1.5 items-center">
                <MessageSquareLock className="size-3 text-muted-foreground" />
                <span className="hidden text-xs line-clamp-1 sm:block">
                  {t("private-group.type.trigger")}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent>{t("private-group.type.content")}</TooltipContent>
          </Tooltip>
        </div>
      </Header>
      <div className="flex flex-row items-center gap-1.5 p-1 pl-4 border-b overflow-hidden">
        {pubkey ? (
          <UserRelays
            pubkey={pubkey}
            relays={
              dmRelays?.dm.length > 0
                ? dmRelays.dm
                : dmRelays
                  ? dmRelays.fallback
                  : []
            }
            isCompliant={dmRelays?.dm.length > 0}
          />
        ) : null}
        {peer !== pubkey && relayList ? (
          <UserRelays
            pubkey={peer}
            relays={
              relayList?.dm.length > 0
                ? relayList.dm
                : relayList
                  ? relayList.fallback
                  : []
            }
            isCompliant={relayList?.dm.length > 0}
            empty={
              <span className="text-sm italic text-muted-foreground">
                {t("private-group.no-relays")}
              </span>
            }
          />
        ) : null}
      </div>
      <GroupChat id={id} group={group} />
    </>
  );
}

function DirectMessageGroupId({ id, pubkey }: { id: string; pubkey: string }) {
  const { t } = useTranslation();
  const group = idToGroup(id, pubkey);
  useGroupDirectMessages(group);
  const isMultiGroup = group.pubkeys.filter((p) => p != pubkey).length > 1;
  const peer = group.pubkeys.find((p) => p != pubkey);
  const singleTarget = peer || pubkey;
  if (isMultiGroup) {
    return <DirectMessageMultiGroup group={group} />;
  } else if (singleTarget) {
    return <SingleGroup group={group} peer={singleTarget} />;
  } else {
    return (
      <p className="text-muted-foreground">
        {t("private-group.invalid-group")}
      </p>
    );
  }
}

export default function DirectMessageGroup() {
  useDirectMessages();
  const pubkey = usePubkey();
  const { id } = useParams();
  const { t } = useTranslation();
  if (id && pubkey) {
    return <DirectMessageGroupId id={id} pubkey={pubkey} />;
  } else {
    return (
      <p className="text-muted-foreground">
        {t("private-group.invalid-group")}
      </p>
    );
  }
}

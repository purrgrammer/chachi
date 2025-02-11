import React, { useState, useEffect, forwardRef, ForwardedRef } from "react";
import { toast } from "sonner";
import { NostrEvent, UnsignedEvent } from "nostr-tools";
import { NDKKind, NDKEvent } from "@nostr-dev-kit/ndk";
import { Badge } from "@/components/ui/badge";
import { Name } from "@/components/nostr/name";
import { useGroupAdminsList } from "@/lib/nostr/groups";
import { useMembers } from "@/lib/messages";
import { ChatInput } from "@/components/nostr/chat/input";
import { ChatNutzap } from "@/components/nostr/nutzap";
import { Chat } from "@/components/nostr/chat/chat";
import { New } from "@/components/nostr/new";
import { NewZap } from "@/components/nostr/zap";
import { useNDK } from "@/lib/ndk";
import { useRelaySet } from "@/lib/nostr";
import { useDeletions } from "@/lib/nostr/chat";
import { usePubkey, useCanSign } from "@/lib/account";
import type { Group } from "@/lib/types";
import { useRelayInfo } from "@/lib/relay";
import {
  useGroupchat,
  useSaveLastSeen,
  useMemoizedLastSeen,
  useNewMessage,
} from "@/lib/messages";
import { DELETE_GROUP } from "@/lib/kinds";
import { useTranslation } from "react-i18next";

//export function ChatZap({
//  event,
//  className,
//}: {
//  event: NostrEvent;
//  className?: string;
//}) {
//  // todo: get amount from proofs
//  const amount = 420;
//  const total = 420;
//  const receiver = event.pubkey;
//  return (
//    <div
//      className={cn(
//        "flex flex-row rounded-lg bg-accent border-2 w-fit max-w-xs sm:max-w-sm md:max-w-md ",
//        className,
//      )}
//    >
//      <div className="p-1 px-2">
//        <div className="flex flex-row gap-2 items-center">
//          <h3 className="text-sm font-semibold">
//            <Name pubkey={event.pubkey} />
//          </h3>
//          {receiver ? (
//            <>
//              <Coins className="size-3 text-muted-foreground" />
//              <h3 className="text-sm font-semibold">
//                <Name pubkey={receiver} />
//              </h3>
//            </>
//          ) : null}
//        </div>
//        <RichText tags={event.tags}>{event.content}</RichText>
//      </div>
//      <div className="flex items-center px-2 rounded-r-lg bg-background">
//        <span className="text-muted-foreground">
//          <Bitcoin className="size-4" />
//        </span>
//        <span className="font-mono text-lg">{total}</span>
//      </div>
//    </div>
//  );
//}

//function JoinGroup({ group }: { group: Group }) {
//  const ndk = useNDK();
//  const relaySet = useRelaySet([group.relay]);
//  const account = useAccount();
//  const pubkey = account?.pubkey;
//  const isReadOnly = !account || account.isReadOnly;
//  const [hasRequestedToJoin, setHasRequestedToJoin] = useState<boolean>(false);
//
//  function requestToJoin() {
//    try {
//      const event = new NDKEvent(ndk, {
//        kind: NDKKind.GroupAdminRequestJoin,
//        content: "",
//        tags: [["h", group.id]],
//      } as NostrEvent);
//      event.publish(relaySet);
//      toast.success("Join request sent");
//    } catch (err) {
//      console.error(err);
//      toast.error("Couldn't join group");
//    }
//  }
//
//  return (
//    <Button
//      disabled={hasRequestedToJoin || isReadOnly}
//      onClick={requestToJoin}
//      size="sm"
//    >
//      {hasRequestedToJoin ? "Requested" : "Join"}
//    </Button>
//  );
//}

function UserActivity({
  event,
  action,
}: {
  event: UnsignedEvent;
  action: "join" | "leave";
}) {
  const member = event.tags.find((t) => t[0] === "p")?.[1];
  const { t } = useTranslation();
  return member ? (
    <div className="flex justify-center my-0.5 w-full">
      <Badge variant="outline" className="self-center">
        <div className="flex gap-1">
          <Name pubkey={member} />
          <span>
            {action === "join"
              ? t("group.chat.user.joined")
              : t("group.chat.user.left")}
          </span>
        </div>
      </Badge>
    </div>
  ) : null;
}

export const GroupChat = forwardRef(
  ({ group }: { group: Group }, ref: ForwardedRef<HTMLDivElement | null>) => {
    // todo: load older messages when scrolling up
    const members: string[] = useMembers(group);
    const { data: adminsList } = useGroupAdminsList(group);
    const { data: relayInfo } = useRelayInfo(group.relay);
    const admins = adminsList || [];
    const events = useGroupchat(group);
    const hasBeenDeleted = events.some((e) => e.kind === DELETE_GROUP);
    const [replyingTo, setReplyingTo] = useState<NostrEvent | undefined>();
    const previousMessageIds = events.slice(-3).map((e) => e.id.slice(0, 8));
    // heights
    const [inputHeight, setInputHeight] = useState(34);
    const headerHeight = 96;
    const nonChatHeight = inputHeight + headerHeight;
    const me = usePubkey();
    const canSign = useCanSign();
    const isAdmin = canSign && me && admins?.includes(me);
    const ndk = useNDK();
    const relaySet = useRelaySet([group.relay]);
    const [sentMessage, setSentMessage] = useState<NostrEvent | undefined>(
      undefined,
    );
    const newMessage = useNewMessage(group);
    const saveLastSeen = useSaveLastSeen(group);
    const { events: deleteEvents } = useDeletions(group);
    const isRelayGroup = group.id === "_";
    const canIPoast =
      me &&
      canSign &&
      (isRelayGroup ||
        members?.includes(me) ||
        admins?.includes(me) ||
        events.find(
          (e) =>
            e.kind === NDKKind.GroupAdminAddUser &&
            e.tags.find((t) => t[0] === "p" && t[1] === me),
        ));
    const { t } = useTranslation();
    const lastSeen = useMemoizedLastSeen(group);

    useEffect(() => {
      return () => saveLastSeen();
    }, [group.id, group.relay]);

    function onNewMessage(ev: NostrEvent) {
      setSentMessage(ev);
      newMessage(ev);
    }

    function canDelete(event: NostrEvent) {
      return isAdmin || event.pubkey === me;
    }

    async function deleteEvent(event: NostrEvent) {
      try {
        const ev = new NDKEvent(ndk, {
          kind:
            event.pubkey === me || group.id === "_"
              ? NDKKind.EventDeletion
              : (9005 as NDKKind),
          content: "",
        } as NostrEvent);
        ev.tag(new NDKEvent(ndk, event));
        await ev.publish(relaySet);
        toast.success(t("group.chat.event.delete.success"));
      } catch (err) {
        console.error(err);
        toast.error(t("group.chat.event.delete.error"));
      }
    }

    return (
      <div className={`grid grid-col-[1fr_${inputHeight}px]"`} ref={ref}>
        <Chat
          group={group}
          admins={admins}
          style={
            {
              height: `calc(100vh - ${nonChatHeight}px)`,
            } as React.CSSProperties
          }
          newMessage={sentMessage}
          lastSeen={lastSeen ? lastSeen : undefined}
          deleteEvents={deleteEvents}
          // @ts-expect-error: these events are unsigned since they come from DB
          events={events}
          canDelete={canDelete}
          deleteEvent={deleteEvent}
          messageKinds={[NDKKind.GroupChat]}
          components={{
            [NDKKind.Nutzap]: ({ event }) => <ChatNutzap event={event} />,
            [NDKKind.GroupAdminAddUser]: (props) => (
              <UserActivity {...props} action="join" />
            ),
            [NDKKind.GroupAdminRemoveUser]: (props) => (
              <UserActivity {...props} action="leave" />
            ),
          }}
          setReplyingTo={setReplyingTo}
        />
        {hasBeenDeleted ? (
          <div
            className="flex justify-center items-center"
            style={{ height: `${inputHeight + 16}px` }}
          >
            <span className="text-sm text-muted-foreground">
              {t("group.deleted")}
            </span>
          </div>
        ) : (
          <ChatInput
            group={group}
            height={inputHeight}
            onHeightChange={(height) => {
              setInputHeight(height);
            }}
            kind={NDKKind.GroupChat}
            replyKind={NDKKind.GroupChat}
            onNewMessage={onNewMessage}
            replyingTo={replyingTo}
            setReplyingTo={setReplyingTo}
            tags={
              previousMessageIds.length > 0
                ? [
                    ["h", group.id, group.relay],
                    ...(isRelayGroup ? [["-"]] : []),
                    ["previous", ...previousMessageIds],
                  ]
                : [
                    ["h", group.id, group.relay],
                    ...(isRelayGroup ? [["-"]] : []),
                  ]
            }
            showJoinRequest={
              !canIPoast && relayInfo?.supported_nips?.includes(29)
            }
          >
            {replyingTo ? (
              <NewZap event={replyingTo} group={group} />
            ) : (
              <New group={group} />
            )}
          </ChatInput>
        )}
      </div>
    );
  },
);
GroupChat.displayName = "GroupChat";

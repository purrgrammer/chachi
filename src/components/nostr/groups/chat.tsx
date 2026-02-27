import React, {
  useState,
  useEffect,
  forwardRef,
  ForwardedRef,
} from "react";
import { toast } from "sonner";
import {
  Crown,
} from "lucide-react";
import { NostrEvent, UnsignedEvent } from "nostr-tools";
import { ProfileDrawer } from "@/components/nostr/profile";
import { NDKKind, NDKEvent } from "@nostr-dev-kit/ndk";
import { Badge } from "@/components/ui/badge";
import { Name } from "@/components/nostr/name";
import { useCommunity, useFetchGroupParticipants } from "@/lib/nostr/groups";
import { ChatInput } from "@/components/nostr/chat/input";
import { Chat } from "@/components/nostr/chat/chat";
import { New } from "@/components/nostr/new";
import { useNDK } from "@/lib/ndk";
import { useRelaySet } from "@/lib/nostr";
import { usePubkey, useCanSign } from "@/lib/account";
import type { Group } from "@/lib/types";
import { useRelayInfo } from "@/lib/relay";
import {
  usePaginatedGroupchat,
  useCommunitychat,
  useLastSeen,
  useNewMessage,
  useSaveLastSeen,
  deleteGroupEvent,
} from "@/lib/messages";
import { DELETE_GROUP } from "@/lib/kinds";
import { useTranslation } from "react-i18next";

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
  group,
}: {
  event: UnsignedEvent;
  action: "join" | "leave";
  group: Group;
}) {
  const member = event.tags.find((t) => t[0] === "p")?.[1];
  const { t } = useTranslation();
  const role = event.tags.find((t) => t[0] === "p")?.[2];
  return member && role && action === "join" ? (
    <div className="flex justify-center my-0.5 w-full">
      <Badge variant="outline" className="self-center">
        <div className="flex gap-1">
          <ProfileDrawer
            group={group}
            pubkey={member}
            trigger={<Name pubkey={member} />}
          />
          <span>{t("group.chat.user.admin", { role })}</span>
          {role === "admin" ? <Crown className="size-4" /> : null}
        </div>
      </Badge>
    </div>
  ) : member ? (
    <div className="flex justify-center my-0.5 w-full">
      <Badge variant="outline" className="self-center">
        <div className="flex gap-1">
          <ProfileDrawer
            group={group}
            pubkey={member}
            trigger={<Name pubkey={member} />}
          />
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
    const { data: participants } = useFetchGroupParticipants(group);
    const members = participants?.members || [];
    const admins = participants?.admins || [];
    const { data: relayInfo } = useRelayInfo(group.relay);
    const { events, hasMore, loadMore, isLoadingMore } =
      usePaginatedGroupchat(group);
    const hasBeenDeleted = events.some((e) => e.kind === DELETE_GROUP);
    const [replyingTo, setReplyingTo] = useState<NostrEvent | undefined>();
    const [scrollTo, setScrollTo] = useState<NostrEvent | undefined>();
    // heights
    const [inputHeight, setInputHeight] = useState(34);
    const headerHeight = 96;
    const nonChatHeight = inputHeight + headerHeight;
    const me = usePubkey();
    const canSign = useCanSign();
    const isMember = me && members?.includes(me);
    const isAdmin = canSign && me && admins?.includes(me);
    const ndk = useNDK();
    const relaySet = useRelaySet([group.relay]);
    const [sentMessage, setSentMessage] = useState<NostrEvent | undefined>(
      undefined,
    );
    const newMessage = useNewMessage(group);
    const isRelayGroup = group.id === "_";
    const canIPoast =
      me &&
      canSign &&
      (isRelayGroup ||
        isMember ||
        isAdmin ||
        events.find(
          (e) =>
            e.kind === NDKKind.GroupAdminAddUser &&
            e.tags.find((t) => t[0] === "p" && t[1] === me),
        ));
    const { t } = useTranslation();
    const lastSeen = useLastSeen(group);
    const saveLast = useSaveLastSeen(group);

    useEffect(() => {
      return () => saveLast();
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
            event.pubkey === me ||
            group.id === "_" ||
            (group.isCommunity && group.id === me)
              ? NDKKind.EventDeletion
              : (9005 as NDKKind),
          content: "",
        } as NostrEvent);
        ev.tag(new NDKEvent(ndk, event));
        await ev.publish(relaySet);
        toast.success(t("group.chat.event.delete.success"));
        deleteGroupEvent(event.id, group);
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
              height: `calc(100dvh - ${nonChatHeight}px)`,
            } as React.CSSProperties
          }
          newMessage={sentMessage}
          lastSeen={lastSeen ? lastSeen : undefined}
          scrollTo={scrollTo}
          setScrollTo={setScrollTo}
          // @ts-expect-error: these events are unsigned since they come from DB
          events={events}
          canDelete={canDelete}
          deleteEvent={deleteEvent}
          messageKinds={[NDKKind.GroupChat]}
          components={{
            [NDKKind.GroupAdminAddUser]: (props) => (
              <UserActivity {...props} group={group} action="join" />
            ),
            [NDKKind.GroupAdminRemoveUser]: (props) => (
              <UserActivity {...props} group={group} action="leave" />
            ),
          }}
          setReplyingTo={setReplyingTo}
          hasMore={hasMore}
          loadMore={loadMore}
          isLoadingMore={isLoadingMore}
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
            tags={[
              ["h", group.id, group.relay],
              ...(isRelayGroup ? [["-"]] : []),
            ]}
            showJoinRequest={
              !canIPoast && relayInfo?.supported_nips?.includes(29)
            }
          >
            <New group={group} />
          </ChatInput>
        )}
      </div>
    );
  },
);
GroupChat.displayName = "GroupChat";

export const CommunityChat = forwardRef(
  (
    { pubkey }: { pubkey: string },
    ref: ForwardedRef<HTMLDivElement | null>,
  ) => {
    const community = useCommunity(pubkey);
    const group = {
      id: pubkey,
      relay: community?.relay || "",
      isCommunity: true,
    };
    const events = useCommunitychat(pubkey);
    const hasBeenDeleted = events.some((e) => e.kind === DELETE_GROUP);
    const [replyingTo, setReplyingTo] = useState<NostrEvent | undefined>();
    const [scrollTo, setScrollTo] = useState<NostrEvent | undefined>();
    const [inputHeight, setInputHeight] = useState(34);
    const headerHeight = 96;
    const nonChatHeight = inputHeight + headerHeight;
    const me = usePubkey();
    const canSign = useCanSign();
    const isAdmin = canSign && me === pubkey;
    const ndk = useNDK();
    const relaySet = useRelaySet([group.relay]);
    const [sentMessage, setSentMessage] = useState<NostrEvent | undefined>(
      undefined,
    );
    const newMessage = useNewMessage(group);
    const { t } = useTranslation();
    const lastSeen = useLastSeen(group);
    const saveLast = useSaveLastSeen(group);

    useEffect(() => {
      return () => saveLast();
    }, [group.id]);

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
            event.pubkey === me ||
            group.id === "_" ||
            (group.isCommunity && group.id === me)
              ? NDKKind.EventDeletion
              : (9005 as NDKKind),
          content: "",
        } as NostrEvent);
        ev.tag(new NDKEvent(ndk, event));
        await ev.publish(relaySet);
        toast.success(t("group.chat.event.delete.success"));
        deleteGroupEvent(event.id, group);
      } catch (err) {
        console.error(err);
        toast.error(t("group.chat.event.delete.error"));
      }
    }

    return (
      <div className={`grid grid-col-[1fr_${inputHeight}px]"`} ref={ref}>
        <Chat
          group={group}
          admins={[pubkey]}
          style={
            {
              height: `calc(100dvh - ${nonChatHeight}px)`,
            } as React.CSSProperties
          }
          newMessage={sentMessage}
          lastSeen={lastSeen ? lastSeen : undefined}
          scrollTo={scrollTo}
          setScrollTo={setScrollTo}
          // @ts-expect-error: these events are unsigned since they come from DB
          events={events}
          canDelete={canDelete}
          deleteEvent={deleteEvent}
          messageKinds={[NDKKind.GroupChat]}
          components={{}}
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
            tags={[["h", pubkey]]}
          >
            <New group={group} />
          </ChatInput>
        )}
      </div>
    );
  },
);
CommunityChat.displayName = "CommunityChat";

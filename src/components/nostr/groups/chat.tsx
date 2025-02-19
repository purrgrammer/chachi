import React, {
  useState,
  useEffect,
  useRef,
  forwardRef,
  ForwardedRef,
} from "react";
import { toast } from "sonner";
import { useInView } from "framer-motion";
import {
  Reply as ReplyIcon,
  SmilePlus,
  Bitcoin,
  Copy,
  ShieldBan,
  Trash,
} from "lucide-react";
import { NostrEvent, UnsignedEvent } from "nostr-tools";
import { Avatar } from "@/components/nostr/avatar";
import { ProfileDrawer } from "@/components/nostr/profile";
import { NDKKind, NDKEvent } from "@nostr-dev-kit/ndk";
import { useSettings } from "@/lib/settings";
import { Badge } from "@/components/ui/badge";
import { Name } from "@/components/nostr/name";
import { useGroupAdminsList } from "@/lib/nostr/groups";
import { useMembers } from "@/lib/messages";
import { ChatInput } from "@/components/nostr/chat/input";
import { Emoji as EmojiType, EmojiPicker } from "@/components/emoji-picker";
import { Chat } from "@/components/nostr/chat/chat";
import { New } from "@/components/nostr/new";
import { NewZapDialog } from "@/components/nostr/zap";
import { NewZap } from "@/components/nostr/zap";
import { useNDK } from "@/lib/ndk";
import { useRelaySet } from "@/lib/nostr";
import { useMintList } from "@/lib/cashu";
import { useDeletions } from "@/lib/nostr/chat";
import { usePubkey, useCanSign } from "@/lib/account";
import type { Group } from "@/lib/types";
import { useCopy } from "@/lib/hooks";
import { useRelayInfo } from "@/lib/relay";
import {
  useGroupchat,
  useMemoizedLastSeen,
  useNewMessage,
  saveLastSeen,
  useSaveLastSeen,
  saveGroupEvent,
} from "@/lib/messages";
import { DELETE_GROUP } from "@/lib/kinds";
import { Nutzap } from "@/components/nostr/nutzap";
import { useTranslation } from "react-i18next";

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuShortcut,
} from "@/components/ui/context-menu";
import { Reactions } from "@/components/nostr/reactions";

interface ChatNutzapProps {
  event: NostrEvent;
  group: Group;
  setReplyingTo?: (event: NostrEvent) => void;
  deleteEvent?: (event: NostrEvent) => void;
  canDelete?: (event: NostrEvent) => boolean;
}

function ChatNutzap({
  event,
  group,
  setReplyingTo,
  canDelete,
  deleteEvent,
}: ChatNutzapProps) {
  // todo: gestures
  const ndk = useNDK();
  const ref = useRef<HTMLDivElement | null>(null);
  const isInView = useInView(ref);
  const [showingEmojiPicker, setShowingEmojiPicker] = useState(false);
  const [showingZapDialog, setShowingZapDialog] = useState(false);
  const { data: mintList } = useMintList(event.pubkey);
  const { data: adminsList } = useGroupAdminsList(group);
  const admins = adminsList || [];
  const pubkey = usePubkey();
  const isMine = event.pubkey === pubkey;
  const amIAdmin = pubkey && admins.includes(pubkey);
  const relaySet = useRelaySet([group.relay]);
  const { t } = useTranslation();
  const [, copy] = useCopy();
  const [settings] = useSettings();

  // todo: extract to hook
  async function react(e: EmojiType) {
    try {
      const ev = new NDKEvent(ndk, {
        kind: NDKKind.Reaction,
        content: e.native ? e.native : e.shortcodes,
      } as NostrEvent);
      ev.tag(new NDKEvent(ndk, event));
      if (e.src) {
        ev.tags.push(["emoji", e.name, e.src]);
      }
      await ev.publish(relaySet);
    } catch (err) {
      console.error(err);
      toast.error(t("chat.message.react.error"));
    } finally {
      setShowingEmojiPicker(false);
    }
  }

  async function kick(e: NostrEvent) {
    try {
      const ev = new NDKEvent(ndk, {
        kind: NDKKind.GroupAdminRemoveUser,
        content: "",
        tags: [
          ...(group ? [["h", group.id, group.relay]] : []),
          ["p", e.pubkey],
        ],
      } as NostrEvent);
      await ev.publish(relaySet);
      toast.success(t("chat.user.kick.success"));
      if (group) {
        saveGroupEvent(ev.rawEvent() as NostrEvent, group);
      }
    } catch (err) {
      console.error(err);
      toast.error(t("chat.user.kick.error"));
    }
  }

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            ref={ref}
            className={`z-0 rounded-md border-none rounded-md my-1 max-w-[18rem] sm:max-w-sm md:max-w-md ${isMine ? "ml-auto" : ""}`}
          >
            <div className="flex flex-col gap-0">
              <div className="flex flex-row gap-2 items-end">
                {isMine ? null : (
                  <ProfileDrawer
                    group={group}
                    pubkey={event.pubkey}
                    trigger={
                      <Avatar pubkey={event.pubkey} className="size-7" />
                    }
                  />
                )}
                <div className="flex flex-col gap-1 relative py-2 px-4 pb-2 bg-background/80 rounded-md">
                  <Nutzap
                    event={event}
                    group={group}
                    showAuthor={false}
                    animateGradient
                  />
                  <Reactions
                    event={event}
                    relays={[group.relay]}
                    kinds={[NDKKind.Nutzap, NDKKind.Zap, NDKKind.Reaction]}
                    live={isInView}
                  />
                </div>
              </div>
            </div>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem
            className="cursor-pointer"
            onClick={() => setReplyingTo?.(event)}
          >
            {t("chat.message.reply.action")}
            <ContextMenuShortcut>
              <ReplyIcon className="w-4 h-4" />
            </ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuItem
            className="cursor-pointer"
            onClick={() => setShowingEmojiPicker(true)}
          >
            {t("chat.message.react.action")}
            <ContextMenuShortcut>
              <SmilePlus className="w-4 h-4" />
            </ContextMenuShortcut>
          </ContextMenuItem>
          {mintList?.pubkey ? (
            <ContextMenuItem
              className="cursor-pointer"
              onClick={() => setShowingZapDialog(true)}
            >
              {t("chat.message.tip.action")}
              <ContextMenuShortcut>
                <Bitcoin className="w-4 h-4" />
              </ContextMenuShortcut>
            </ContextMenuItem>
          ) : null}
          <ContextMenuSeparator />
          <ContextMenuItem
            className="cursor-pointer"
            onClick={() => copy(event.content)}
          >
            {t("chat.message.copy.action")}
            <ContextMenuShortcut>
              <Copy className="w-4 h-4" />
            </ContextMenuShortcut>
          </ContextMenuItem>
          {amIAdmin && event.pubkey !== pubkey ? (
            <>
              <ContextMenuSeparator />
              <ContextMenuLabel>{t("group.info.admin")}</ContextMenuLabel>
              <ContextMenuItem
                className="cursor-pointer"
                onClick={() => kick(event)}
              >
                {t("chat.user.kick.action")}
                <ContextMenuShortcut>
                  <ShieldBan className="w-4 h-4" />
                </ContextMenuShortcut>
              </ContextMenuItem>
              {deleteEvent ? (
                <ContextMenuItem
                  className="cursor-pointer"
                  onClick={() => deleteEvent(event)}
                >
                  {t("chat.message.delete.action")}
                  <ContextMenuShortcut>
                    <Trash className="w-4 h-4" />
                  </ContextMenuShortcut>
                </ContextMenuItem>
              ) : null}
            </>
          ) : deleteEvent && canDelete?.(event) ? (
            <ContextMenuItem
              className="cursor-pointer"
              onClick={() => deleteEvent(event)}
            >
              {t("chat.message.delete.action")}
              <ContextMenuShortcut>
                <Trash className="w-4 h-4 text-destructive" />
              </ContextMenuShortcut>
            </ContextMenuItem>
          ) : null}
          {settings.devMode ? (
            <>
              <ContextMenuSeparator />
              <ContextMenuLabel className="text-xs font-light">
                {t("chat.debug")}
              </ContextMenuLabel>
              <ContextMenuItem
                className="cursor-pointer"
                onClick={() => console.log(event)}
              >
                Log
              </ContextMenuItem>
              {group ? (
                <ContextMenuItem
                  className="cursor-pointer"
                  onClick={() => saveLastSeen(event, group)}
                >
                  {t("chat.message.save-as-last-seen")}
                </ContextMenuItem>
              ) : null}
            </>
          ) : null}
        </ContextMenuContent>
      </ContextMenu>
      {showingEmojiPicker ? (
        <EmojiPicker
          open={showingEmojiPicker}
          onOpenChange={(open) => setShowingEmojiPicker(open)}
          onEmojiSelect={react}
        >
          <div className="pointer-events-none">
            <Nutzap event={event} showAuthor={false} />
          </div>
        </EmojiPicker>
      ) : null}
      {showingZapDialog ? (
        <NewZapDialog
          open
          event={event}
          pubkey={event.pubkey}
          group={group}
          onClose={() => setShowingZapDialog(false)}
        />
      ) : null}
    </>
  );
}

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
            [NDKKind.Nutzap]: ({ event }) => (
              <ChatNutzap
                key={event.id}
                event={event}
                group={group}
                setReplyingTo={setReplyingTo}
                canDelete={canDelete}
                deleteEvent={deleteEvent}
              />
            ),
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

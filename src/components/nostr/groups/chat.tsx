import React, {
  useState,
  useEffect,
  useRef,
  forwardRef,
  ForwardedRef,
} from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";
import { useInView } from "framer-motion";
import {
  Crown,
  Reply as ReplyIcon,
  SmilePlus,
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
import { useCommunity, useFetchGroupParticipants } from "@/lib/nostr/groups";
import { Zap } from "@/components/nostr/zap";
import { validateZap } from "@/lib/nip-57";
import { ChatInput } from "@/components/nostr/chat/input";
import type { Emoji as EmojiType } from "@/components/emoji-picker";
import { LazyEmojiPicker } from "@/components/lazy/LazyEmojiPicker";
import { Chat } from "@/components/nostr/chat/chat";
import { New } from "@/components/nostr/new";
import { useNDK } from "@/lib/ndk";
import { useRelaySet } from "@/lib/nostr";
import { usePubkey, useCanSign } from "@/lib/account";
import type { Group } from "@/lib/types";
import { useCopy } from "@/lib/hooks";
import { useRelayInfo } from "@/lib/relay";
import {
  usePaginatedGroupchat,
  useCommunitychat,
  useLastSeen,
  useNewMessage,
  saveLastSeen,
  useSaveLastSeen,
  saveGroupEvent,
  deleteGroupEvent,
} from "@/lib/messages";
import { DELETE_GROUP } from "@/lib/kinds";
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
import { eventLink } from "@/lib/links";
import { cn } from "@/lib/utils";
import { useReact } from "@/lib/nostr/react";

interface ChatZapProps {
  event: NostrEvent;
  group: Group;
  admins: string[];
  scrollTo?: NostrEvent;
  setScrollTo?: (ev?: NostrEvent) => void;
  setReplyingTo?: (event: NostrEvent) => void;
  deleteEvent?: (event: NostrEvent) => void;
  canDelete?: (event: NostrEvent) => boolean;
  showReactions?: boolean;
}

function ChatZap({
  event,
  group,
  admins,
  setReplyingTo,
  scrollTo,
  setScrollTo,
  canDelete,
  deleteEvent,
  showReactions,
}: ChatZapProps) {
  // todo: gestures
  const zap = validateZap(event);
  const ndk = useNDK();
  const ref = useRef<HTMLDivElement | null>(null);
  const isInView = useInView(ref);
  const [showingEmojiPicker, setShowingEmojiPicker] = useState(false);
  const navigate = useNavigate();
  const pubkey = usePubkey();
  const isMine = zap?.pubkey === pubkey;
  const amIAdmin = pubkey && admins.includes(pubkey);
  const relaySet = useRelaySet([group.relay]);
  const { t } = useTranslation();
  const [, copy] = useCopy();
  const [settings] = useSettings();
  const isMobile = useIsMobile();
  const canSign = useCanSign();
  const isFocused = scrollTo?.id === zap?.id;
  const react = useReact(event, group, t("chat.message.react.error"));

  useEffect(() => {
    if (isFocused && ref.current) {
      ref.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [isFocused]);

  if (!zap) return null;

  async function onEmojiSelect(e: EmojiType) {
    try {
      await react(e);
    } catch (err) {
      console.error(err);
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
          ["h", group.id, group.relay],
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

  function onNutzapReplyClick(ev: NostrEvent) {
    // todo: use messageKinds here
    if (
      ev.kind === NDKKind.Nutzap ||
      ev.kind === NDKKind.GroupChat ||
      ev.kind === NDKKind.Zap
    ) {
      setScrollTo?.(ev);
    } else {
      navigate(eventLink(ev, group));
    }
  }

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            className={`flex flex-row ${isMine ? "justify-end" : ""} w-full z-0 ${isFocused ? "bg-accent/30 rounded-lg" : ""}`}
          >
            <motion.div
              // Drag controls
              drag={isMobile && !isMine && canSign ? "x" : false}
              dragSnapToOrigin={true}
              dragConstraints={{ left: 20, right: 20 }}
              dragElastic={{ left: 0.2, right: 0.2 }}
              onDragEnd={(_, info) => {
                if (info.offset.x > 20) {
                  setReplyingTo?.(event);
                } else if (info.offset.x < -20) {
                  setShowingEmojiPicker(true);
                }
              }}
              ref={ref}
              className="z-0 border-none my-1 max-w-[18rem] sm:max-w-sm md:max-w-md"
            >
              <div className="flex flex-col gap-0">
                <div className="flex flex-row gap-2 items-end">
                  {isMine ? null : (
                    <ProfileDrawer
                      group={group}
                      pubkey={zap.pubkey}
                      trigger={
                        <Avatar pubkey={zap.pubkey} className="size-7" />
                      }
                    />
                  )}
                  <div
                    className={cn(
                      "flex flex-col gap-1 relative p-1 px-2 bg-background/80 rounded-md",
                      isMine
                        ? "rounded-tl-md rounded-tr-md rounded-bl-md rounded-br-none"
                        : "rounded-tl-md rounded-tr-md rounded-br-md rounded-bl-none",
                    )}
                  >
                    <Zap
                      zap={zap}
                      className={
                        isMine
                          ? "rounded-tl-md rounded-tr-md rounded-bl-md rounded-br-none"
                          : "rounded-tl-md rounded-tr-md rounded-br-md rounded-bl-none"
                      }
                      group={group}
                      animateGradient
                      showAuthor={false}
                      onReplyClick={onNutzapReplyClick}
                      classNames={{
                        singleCustomEmoji: isMine ? "ml-auto" : "",
                        onlyEmojis: isMine ? "ml-auto" : "",
                      }}
                    />
                    {showReactions ? (
                      <Reactions
                        event={event}
                        relays={[group.relay]}
                        kinds={[NDKKind.Nutzap, NDKKind.Zap, NDKKind.Reaction]}
                        live={isInView}
                      />
                    ) : null}
                  </div>
                </div>
              </div>
            </motion.div>
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
          <ContextMenuSeparator />
          <ContextMenuItem
            className="cursor-pointer"
            onClick={() => copy(zap.content)}
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
                    <Trash className="w-4 h-4 text-destructive" />
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
      <LazyEmojiPicker
        open={showingEmojiPicker}
        onOpenChange={(open) => setShowingEmojiPicker(open)}
        onEmojiSelect={onEmojiSelect}
      />
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
            [NDKKind.Zap]: ({ event, ...props }) => (
              <ChatZap
                key={event.id}
                event={event}
                group={group}
                canDelete={canDelete}
                deleteEvent={deleteEvent}
                {...props}
              />
            ),
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
          components={{
            [NDKKind.Zap]: ({ event, ...props }) => (
              <ChatZap
                key={event.id}
                event={event}
                group={group}
                canDelete={canDelete}
                deleteEvent={deleteEvent}
                {...props}
                showReactions
              />
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

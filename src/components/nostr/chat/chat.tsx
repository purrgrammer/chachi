import { useMemo, useState, useEffect, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { toast } from "sonner";
import {
  Crown,
  Reply as ReplyIcon,
  SmilePlus,
  Copy,
  Trash,
  Ban,
  ShieldBan,
  Bitcoin,
  Loader2,
  History,
} from "lucide-react";
import type { NostrEvent } from "nostr-tools";
import { Button } from "@/components/ui/button";
import { NDKEvent, NDKKind } from "@nostr-dev-kit/ndk";
import { cn } from "@/lib/utils";
import { ProfileDrawer } from "@/components/nostr/profile";
import { Separator } from "@/components/ui/separator";
import { Emoji } from "@/components/emoji";
import { NewZapDialog } from "@/components/nostr/zap";
import { Badge } from "@/components/ui/badge";
import {
  useRichText,
  EventFragment,
  BlockFragment,
  EmojiFragment,
  RichText,
  RichTextOptions,
  RichTextClassnames,
} from "@/components/rich-text";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuShortcut,
} from "@/components/ui/context-menu";
import { Name } from "@/components/nostr/name";
import { Reactions } from "@/components/nostr/reactions";
import { useIsMobile } from "@/hooks/use-mobile";
import { validateZap } from "@/lib/nip-57";
import { useCopy } from "@/lib/hooks";
import { useNDK } from "@/lib/ndk";
import { Avatar } from "@/components/nostr/avatar";
import { useEvent, useRelaySet } from "@/lib/nostr";
import { usePubkey, useCanSign } from "@/lib/account";
import type { Emoji as EmojiType } from "@/components/emoji-picker";
import { LazyEmojiPicker } from "@/components/lazy/LazyEmojiPicker";
import { saveLastSeen, saveGroupEvent } from "@/lib/messages";
import { useSettings } from "@/lib/settings";
//import { useIsUnpublished, useRetryUnpublishedEvent } from "@/lib/unpublished";
import type { Group } from "@/lib/types";
import { useTranslation } from "react-i18next";
import { groupByDay, formatDay } from "@/lib/chat";
import { useReact } from "@/lib/nostr/react";

function Reply({
  group,
  admins,
  id,
  className,
  setScrollTo,
}: {
  group?: Group;
  admins: string[];
  id: string;
  className?: string;
  setScrollTo?: (ev?: NostrEvent) => void;
}) {
  const { t } = useTranslation();
  // todo: replying to picture, video, mention, custom emoji
  const { data: event } = useEvent({
    id,
    relays: group ? [group.relay] : [],
  });
  const isAdmin = event?.pubkey ? admins.includes(event?.pubkey) : false;
  const author =
    event && event.kind === NDKKind.Zap
      ? validateZap(event)?.pubkey || event?.pubkey
      : event?.pubkey;

  const isGroupChat = event?.kind === NDKKind.GroupChat;
  const isText = event?.kind === NDKKind.Text;
  const isGenericReply = event?.kind === NDKKind.GenericReply;

  if (!(isGroupChat || isText || isGenericReply)) {
    return null;
  }

  return (
    <div
      className={cn(
        "h-12 p-1 pl-2 border-l-4 rounded-md mb-1 bg-background/80 border-background dark:bg-background/40 dark:border-background/60",
        event ? "cursor-pointer" : "animate-pulse place-content-center",
        className,
      )}
      onClick={event ? () => setScrollTo?.(event) : undefined}
    >
      {event && author ? (
        <>
          <div className="flex flex-row gap-1 items-center">
            <h4 className="text-sm font-semibold">
              <Name pubkey={author} />
            </h4>
            {isAdmin ? <Crown className="w-3 h-3" /> : null}
          </div>
          <RichText
            group={group}
            tags={event.tags}
            options={{
              mentions: true,
              reactions: false,
              urls: true,
              emojis: true,
              images: false,
              video: false,
              audio: false,
              youtube: false,
              events: false,
              hashtags: true,
              ecash: false,
            }}
            className="line-clamp-1"
          >
            {event.content}
          </RichText>
        </>
      ) : (
        <span>{t("chat.message.loading")}</span>
      )}
    </div>
  );
}

// Component for user's own messages that checks unpublished status
function UserMessage({
  group,
  event,
  admins,
  isChain,
  isLastSeen,
  isFirstInChain,
  isLast,
  setReplyingTo,
  canDelete,
  deleteEvent,
  isNew,
  isDeleted,
  showRootReply = true,
  canReact = true,
  richTextOptions,
  richTextClassnames = {},
  className,
  scrollTo,
  setScrollTo,
  showReactions,
}: {
  group?: Group;
  event: NostrEvent;
  admins: string[];
  isChain?: boolean;
  isLastSeen?: boolean;
  isFirstInChain?: boolean;
  isLast?: boolean;
  isDeleted?: boolean;
  setReplyingTo?: (event: NostrEvent | undefined) => void;
  canDelete?: (ev: NostrEvent) => boolean;
  deleteEvent?: (event: NostrEvent) => void;
  isNew?: boolean;
  showRootReply?: boolean;
  canReact?: boolean;
  richTextOptions?: RichTextOptions;
  richTextClassnames?: RichTextClassnames;
  className?: string;
  scrollTo?: NostrEvent;
  setScrollTo?: (ev?: NostrEvent) => void;
  showReactions?: boolean;
}) {
  return (
    <>
      <MessageContent
        group={group}
        event={event}
        admins={admins}
        isChain={isChain}
        isLastSeen={isLastSeen}
        isFirstInChain={isFirstInChain}
        isLast={isLast}
        setReplyingTo={setReplyingTo}
        canDelete={canDelete}
        deleteEvent={deleteEvent}
        isNew={isNew}
        isDeleted={isDeleted}
        isMine={true}
        showRootReply={showRootReply}
        canReact={canReact}
        richTextOptions={{
          ...richTextOptions,
          reactions: false,
        }}
        richTextClassnames={richTextClassnames}
        className={className}
        scrollTo={scrollTo}
        setScrollTo={setScrollTo}
        showReactions={showReactions}
      />
    </>
  );
}

// Core message component without unpublished status check
function MessageContent({
  group,
  event,
  admins,
  isChain,
  isLastSeen,
  isFirstInChain,
  isLast,
  setReplyingTo,
  canDelete,
  deleteEvent,
  isNew,
  isDeleted,
  isMine,
  showRootReply = true,
  showReply = true,
  canReact = true,
  richTextOptions,
  richTextClassnames = {},
  className,
  scrollTo,
  setScrollTo,
  showReactions = true,
}: {
  group?: Group;
  event: NostrEvent;
  admins: string[];
  isChain?: boolean;
  isLastSeen?: boolean;
  isFirstInChain?: boolean;
  isLast?: boolean;
  isDeleted?: boolean;
  setReplyingTo?: (event: NostrEvent | undefined) => void;
  canDelete?: (ev: NostrEvent) => boolean;
  deleteEvent?: (event: NostrEvent) => void;
  isNew?: boolean;
  isMine: boolean;
  showRootReply?: boolean;
  showReply?: boolean;
  canReact?: boolean;
  richTextOptions?: RichTextOptions;
  richTextClassnames?: RichTextClassnames;
  className?: string;
  scrollTo?: NostrEvent;
  setScrollTo?: (ev?: NostrEvent) => void;
  showReactions?: boolean;
}) {
  const { t } = useTranslation();
  const [settings] = useSettings();
  const relay = group?.relay;
  const ndk = useNDK();
  const relaySet = useRelaySet(group ? [group.relay] : []);
  const [showMessageActions, setShowMessageActions] = useState(false);
  const [showingEmojiPicker, setShowingEmojiPicker] = useState(false);
  const [showingZapDialog, setShowingZapDialog] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const lastSeenRef = useRef<HTMLDivElement | null>(null);
  const isInView = useInView(ref);
  const isMobile = useIsMobile();
  const author = event.pubkey;
  const content = event.content.trim();
  const legacyReply = event.tags.find((t) => t[3] === "reply")?.[1];
  const eReply = event.tags.find((t) => t[0] === "e")?.[1];
  const quotedReply = event.tags.find(
    (t) => t[0] === "q" && t[1] && t[1].length === 64,
  )?.[1];
  const replyTo = legacyReply || eReply || quotedReply;
  const replyRoot = event.tags.find((t) => t[3] === "root")?.[1];
  const isReplyingTo = replyTo || replyRoot;
  const isFocused = scrollTo?.id === event.id;
  const isAdmin = author ? admins.includes(author) : false;
  const me = usePubkey();
  const canSign = useCanSign();
  const amIAdmin = me && admins.includes(me);
  const isOnlyEmojis =
    /^\p{Emoji_Presentation}{1}\s*\p{Emoji_Presentation}{0,1}$/u.test(content);

  const fragments = useRichText(
    content,
    {
      events: true,
      images: true,
      mentions: true,
      video: true,
      audio: true,
      emojis: true,
      urls: true,
      ecash: true,
      reactions: false,
    },
    event.tags,
  );
  const eventFragmentIds = useMemo(() => {
    return fragments.flatMap((f) => {
      if (f.type === "block") {
        return f.nodes
          .filter((n) => n.type === "event")
          .map((n) => (n as EventFragment).id);
      } else if (f.type === "event") {
        return [(f as EventFragment).id];
      } else {
        return [];
      }
    });
  }, [fragments]);
  const shouldShowReply =
    !isDeleted && showReply && replyTo && !eventFragmentIds.includes(replyTo);
  const isSingleCustomEmoji =
    fragments.length === 1 &&
    fragments[0].type === "block" &&
    fragments[0].nodes.length === 1 &&
    fragments[0].nodes[0].type === "emoji";
  const singleCustomEmoji = isSingleCustomEmoji
    ? ((fragments[0] as BlockFragment).nodes[0] as EmojiFragment)
    : null;
  // todo: try these with reactions
  const isOnlyImage =
    fragments.length === 1 &&
    fragments[0].type === "block" &&
    fragments[0].nodes.length === 1 &&
    fragments[0].nodes[0].type === "image";
  const isOnlyVideo =
    fragments.length === 1 &&
    fragments[0].type === "block" &&
    fragments[0].nodes.length === 1 &&
    fragments[0].nodes[0].type === "video";
  const isOnlyAudio =
    fragments.length === 1 &&
    fragments[0].type === "block" &&
    fragments[0].nodes.length === 1 &&
    fragments[0].nodes[0].type === "audio";
  // todo: these should be flattened
  const isSingleEmbed =
    fragments.length === 1 &&
    fragments[0].type === "block" &&
    fragments[0].nodes.length === 1 &&
    (fragments[0].nodes[0]?.type === "event" ||
      fragments[0].nodes[0]?.type === "address" ||
      fragments[0].nodes[0].type === "ecash");
  const shouldHaveTransparentBackground =
    (isSingleCustomEmoji ||
      isOnlyEmojis ||
      isOnlyImage ||
      isOnlyVideo ||
      isOnlyAudio ||
      isSingleEmbed) &&
    (!isReplyingTo || !shouldShowReply) &&
    !isDeleted;
  const [, copy] = useCopy();
  const react = useReact(event, group, t("chat.message.react.error"));

  useEffect(() => {
    if (isFocused && ref.current) {
      ref.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [isFocused]);

  useEffect(() => {
    if (isLastSeen && lastSeenRef.current) {
      lastSeenRef.current.scrollIntoView({
        behavior: "instant",
        block: "center",
      });
    }
  }, [isLastSeen]);

  useEffect(() => {
    if (isNew && ref.current) {
      ref.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [isNew]);

  function enableMessageActions() {
    setShowMessageActions(true);
  }

  async function onEmojiSelect(e: EmojiType) {
    try {
      await react(e);
    } catch (err) {
      console.error(err);
    } finally {
      setShowingEmojiPicker(false);
      setShowMessageActions(false);
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

  if (!content) return null;

  return (
    <>
      <motion.div
        // New message animation
        initial={{ scale: isNew ? 0.2 : 1 }}
        animate={{ scale: 1 }}
        // Hover
        onHoverStart={canReact && !isMine ? enableMessageActions : undefined}
        onHoverEnd={
          canReact && !isMine && !showingEmojiPicker
            ? () => setShowMessageActions(false)
            : undefined
        }
        ref={ref}
        className={cn(
          `flex flex-row gap-2 items-end ${isLast ? "mb-0" : isChain ? "mb-0.5" : "mb-2"} ${isMine ? "ml-auto" : ""} transition-colors ${isFocused ? "bg-accent/30 rounded-lg" : ""}`,
          className,
        )}
      >
        {isMine || isChain ? null : (
          <ProfileDrawer
            group={group}
            pubkey={author}
            trigger={<Avatar pubkey={author} className="size-7" />}
          />
        )}
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <div className="flex flex-row gap-2 items-center">
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
                className={`z-0 relative ${isChain ? "rounded-lg" : isMine ? "rounded-tl-lg rounded-tr-lg rounded-bl-lg" : "rounded-tl-lg rounded-tr-lg rounded-br-lg"} p-1 px-2 w-fit max-w-[18rem] sm:max-w-sm md:max-w-md ${isChain && !isMine ? "ml-9" : ""} ${shouldHaveTransparentBackground ? "bg-transparent p-0" : isMine ? "bg-primary/10 text-foreground dark:bg-primary dark:text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}
              >
                {isFirstInChain ? (
                  <div className="flex flex-row gap-1 items-center">
                    <ProfileDrawer
                      group={group}
                      pubkey={author}
                      trigger={
                        <h3 className="text-sm font-semibold">
                          <Name pubkey={author} />
                        </h3>
                      }
                    />
                    {isAdmin ? <Crown className="w-3 h-3" /> : null}
                  </div>
                ) : null}
                {(replyTo || (replyRoot && showRootReply)) &&
                isReplyingTo &&
                shouldShowReply ? (
                  <Reply
                    setScrollTo={setScrollTo}
                    group={group}
                    admins={admins}
                    id={isReplyingTo}
                    className={
                      isMine
                        ? "bg-secondary border-primary/40 text-secondary-foreground"
                        : undefined
                    }
                  />
                ) : null}
                {isDeleted ? (
                  <div
                    className={`flex flex-row items-center gap-1 ${isMine ? "text-primary-foreground" : "text-muted-foreground"}`}
                  >
                    <Ban className="size-3" />
                    <span className="text-xs italic">
                      {t("chat.message.deleted")}
                    </span>
                  </div>
                ) : isOnlyEmojis ? (
                  <div className={isMine ? "text-right" : ""}>
                    <span className="text-7xl">{content}</span>
                  </div>
                ) : isSingleCustomEmoji && singleCustomEmoji ? (
                  <div className={isMine ? "flex items-end justify-end" : ""}>
                    <Emoji
                      key={singleCustomEmoji.name}
                      name={singleCustomEmoji.name}
                      image={singleCustomEmoji.image}
                      address={singleCustomEmoji.address}
                      className={`w-32 h-32 aspect-auto rounded-md`}
                    />
                  </div>
                ) : (
                  <RichText
                    group={group}
                    tags={event.tags}
                    fragments={fragments}
                    options={{
                      ...richTextOptions,
                      reactions: false,
                    }}
                    classNames={{
                      ...{
                        singleEmoji: "w-32 h-32 aspect-auto rounded-md",
                        image: "m-0",
                      },
                      ...richTextClassnames,
                    }}
                  >
                    {content}
                  </RichText>
                )}
                {isDeleted ? null : showReactions ? (
                  <Reactions
                    className="pt-1"
                    event={event}
                    relays={[...(relay ? [relay] : [])]}
                    kinds={[NDKKind.Nutzap, NDKKind.Zap, NDKKind.Reaction]}
                    live={isInView}
                  />
                ) : null}
                {showingZapDialog && group ? (
                  <NewZapDialog
                    open
                    event={event}
                    pubkey={event.pubkey}
                    group={group}
                    onClose={() => setShowingZapDialog(false)}
                    onZap={() => setShowingZapDialog(false)}
                    zapType="nip-57"
                  />
                ) : null}
                <LazyEmojiPicker
                  open={showingEmojiPicker}
                  onOpenChange={(open) => setShowingEmojiPicker(open)}
                  onEmojiSelect={onEmojiSelect}
                />
                {showMessageActions && canReact ? (
                  <div className="flex absolute bottom-0 -right-7 flex-col gap-1">
                    <Button
                      variant="outline"
                      size="smallIcon"
                      onClick={() => setShowingEmojiPicker(true)}
                      aria-label={t("aria.add-emoji")}
                    >
                      <SmilePlus />
                    </Button>
                  </div>
                ) : null}
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
            <ContextMenuItem
              className="cursor-pointer"
              onClick={() => setShowingZapDialog(true)}
            >
              {t("chat.message.tip.action")}
              <ContextMenuShortcut>
                <Bitcoin className="w-4 h-4" />
              </ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem
              className="cursor-pointer"
              onClick={() => copy(content)}
            >
              {t("chat.message.copy.action")}
              <ContextMenuShortcut>
                <Copy className="w-4 h-4" />
              </ContextMenuShortcut>
            </ContextMenuItem>
            {amIAdmin && event.pubkey !== me ? (
              <>
                <ContextMenuSeparator />
                <ContextMenuLabel>{t("group.info.admin")}</ContextMenuLabel>
                {group?.isCommunity ? null : (
                  <ContextMenuItem
                    className="cursor-pointer"
                    onClick={() => kick(event)}
                  >
                    {t("chat.user.kick.action")}
                    <ContextMenuShortcut>
                      <ShieldBan className="w-4 h-4" />
                    </ContextMenuShortcut>
                  </ContextMenuItem>
                )}
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
      </motion.div>
      {isLastSeen ? (
        <div
          ref={lastSeenRef}
          className="flex flex-col justify-center items-center my-3 w-full"
        >
          <Separator />
          <Badge className="-mt-3 text-xs">{t("chat.new-messages")}</Badge>
        </div>
      ) : null}
    </>
  );
}

// Main ChatMessage component that conditionally renders the appropriate message component
export function ChatMessage(props: {
  group?: Group;
  event: NostrEvent;
  admins: string[];
  isChain?: boolean;
  isLastSeen?: boolean;
  isFirstInChain?: boolean;
  isLast?: boolean;
  isDeleted?: boolean;
  setReplyingTo?: (event: NostrEvent | undefined) => void;
  canDelete?: (ev: NostrEvent) => boolean;
  deleteEvent?: (event: NostrEvent) => void;
  isNew?: boolean;
  isMine?: boolean;
  showRootReply?: boolean;
  showReply?: boolean;
  canReact?: boolean;
  richTextOptions?: RichTextOptions;
  richTextClassnames?: RichTextClassnames;
  className?: string;
  scrollTo?: NostrEvent;
  setScrollTo?: (ev?: NostrEvent) => void;
  showReactions?: boolean;
}) {
  const { event, isMine } = props;
  const me = usePubkey();

  if (me && event.pubkey === me) {
    return <UserMessage {...props} />;
  }

  return <MessageContent {...props} isMine={!!isMine} />;
}

// todo
// join/request access
// message transition
// threads
// zaps
// emoji reactions
// autocomplete emoji
// deletes
//  - admin
//  - user

type MotionProps = React.ComponentProps<typeof motion.div>;

interface ChatProps extends MotionProps {
  group?: Group;
  events: NostrEvent[];
  admins: string[];
  messageKinds: NDKKind[];
  canDelete?: (event: NostrEvent) => boolean;
  deleteEvent?: (event: NostrEvent) => void;
  components?: Record<
    number,
    React.ComponentType<{
      event: NostrEvent;
      admins: string[];
      scrollTo?: NostrEvent;
      setScrollTo?: (ev?: NostrEvent) => void;
      setReplyingTo?: (event: NostrEvent) => void;
      deleteEvent?: (event: NostrEvent) => void;
      canDelete?: (event: NostrEvent) => boolean;
      showReactions?: boolean;
    }>
  >;
  setReplyingTo?: (event: NostrEvent | undefined) => void;
  className?: string;
  style?: React.CSSProperties;
  scrollTo?: NostrEvent;
  setScrollTo?: (ev?: NostrEvent) => void;
  newMessage?: NostrEvent;
  showRootReply?: boolean;
  showTimestamps?: boolean;
  lastSeen?: { ref: string };
  showReactions?: boolean;
  hasMore?: boolean;
  loadMore?: () => void;
  isLoadingMore?: boolean;
}

export function Chat({
  group,
  events,
  admins,
  canDelete,
  deleteEvent,
  messageKinds,
  components,
  setReplyingTo,
  style,
  newMessage,
  showRootReply = true,
  showTimestamps = true,
  className,
  lastSeen,
  scrollTo,
  setScrollTo,
  showReactions = true,
  hasMore = false,
  loadMore,
  isLoadingMore = false,
}: ChatProps) {
  // todo: check admin events against relay pubkey
  const { t } = useTranslation();
  const groupedMessages = groupByDay(events);
  const lastMessage = events.filter((e) => e.kind === NDKKind.GroupChat).at(0);
  const me = usePubkey();

  useEffect(() => {
    return () => setScrollTo?.(undefined);
  }, [group?.id, group?.relay]);

  return (
    <div
      className={cn(
        "flex flex-col-reverse overflow-x-hidden overflow-y-auto px-2 w-full transition-height relative pretty-scrollbar",
        className,
      )}
      style={style}
    >
      {groupedMessages.map(({ day, messages }, groupIdx) => (
        <div className="flex flex-col w-full" key={groupIdx}>
          {showTimestamps && messages.length > 0 ? (
            <div className="flex justify-center my-2 w-full">
              <Badge variant="outline" className="self-center">
                {formatDay(day)}
              </Badge>
            </div>
          ) : null}
          {messages.map((event, idx) => {
            const Component = components?.[event.kind];
            return messageKinds.includes(event.kind) ? (
              <ChatMessage
                key={event.id}
                group={group}
                event={event}
                canDelete={canDelete}
                deleteEvent={deleteEvent}
                admins={admins}
                isDeleted={Boolean("deleted" in event && event.deleted)}
                isChain={messages[idx + 1]?.pubkey === event.pubkey}
                isLastSeen={
                  event.id === lastSeen?.ref && event.id !== lastMessage?.id
                }
                isFirstInChain={messages[idx - 1]?.pubkey !== event.pubkey}
                isMine={event.pubkey === me}
                isLast={
                  idx === messages.length - 1 &&
                  groupIdx === groupedMessages.length - 1
                }
                setReplyingTo={setReplyingTo}
                isNew={newMessage?.id === event.id}
                showRootReply={showRootReply}
                scrollTo={scrollTo}
                setScrollTo={setScrollTo}
                showReactions={showReactions}
              />
            ) : Component ? (
              <Component
                key={event.id}
                event={event}
                admins={admins}
                setReplyingTo={setReplyingTo}
                scrollTo={scrollTo}
                setScrollTo={setScrollTo}
                showReactions={false}
              />
            ) : null;
          })}
        </div>
      ))}
      {hasMore && loadMore ? (
        <div className="flex justify-center my-4">
          <Button
            variant="outline"
            size="sm"
            onClick={loadMore}
            disabled={isLoadingMore}
          >
            {isLoadingMore ? (
              <Loader2 className="size-4 animate-spin mr-2" />
            ) : (
              <History className="size-4 mr-2" />
            )}
            {t("chat.load-older")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

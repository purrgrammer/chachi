import { useMemo, useState, useEffect, useRef } from "react";
import { NostrEvent } from "nostr-tools";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Reply as ReplyIcon,
  SmilePlus,
  Copy,
  Ban,
  Bitcoin,
  Pin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMintList } from "@/lib/cashu";
import { NDKEvent, NDKRelaySet, NDKKind, NDKUser } from "@nostr-dev-kit/ndk";
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
import { ReactionsList } from "@/components/nostr/reactions";
import { useIsMobile } from "@/hooks/use-mobile";
import { useCopy } from "@/lib/hooks";
import { useNDK } from "@/lib/ndk";
import { Avatar } from "@/components/nostr/avatar";
import { usePubkey, useCanSign } from "@/lib/account";
import { useEvent } from "@/lib/nostr/dm";
import type { Emoji as EmojiType } from "@/components/emoji-picker";
import { LazyEmojiPicker } from "@/components/lazy/LazyEmojiPicker";
import { useSettings } from "@/lib/settings";
import type { PrivateGroup as Group } from "@/lib/types";
import { giftWrap } from "@/lib/nip-59";
import {
  savePrivateEvent,
  useGroupRelays,
  useGroupReactions,
} from "@/lib/nostr/dm";
import { useTranslation } from "react-i18next";
import { Embed } from "../detail";
import { groupByDay, formatDay } from "@/lib/chat";

function Reply({
  id,
  className,
  setScrollTo,
}: {
  group: Group;
  id: string;
  className?: string;
  setScrollTo?: (ev?: NostrEvent) => void;
}) {
  const { t } = useTranslation();
  // todo: replying to picture, video, mention, custom emoji
  const event = useEvent(id);
  return (
    <div
      className={cn(
        "h-12 p-1 pl-2 border-l-4 rounded-md mb-1 bg-background/80 border-background dark:bg-background/40 dark:border-background/60",
        event ? "cursor-pointer" : "animate-pulse place-content-center",
        className,
      )}
      onClick={
        event ? () => setScrollTo?.(event as unknown as NostrEvent) : undefined
      }
    >
      {event ? (
        <>
          <div className="flex flex-row gap-1 items-center">
            <h4 className="text-sm font-semibold">
              <Name pubkey={event.pubkey} />
            </h4>
          </div>
          <RichText
            tags={event.tags}
            options={{
              mentions: true,
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

export function ChatMessage({
  group,
  event,
  isChain,
  isLastSeen,
  isFirstInChain,
  isLast,
  setReplyingTo,
  isNew,
  isDeleted,
  isMine,
  showRootReply = true,
  canReact = true,
  richTextOptions,
  richTextClassnames = {},
  className,
  scrollTo,
  setScrollTo,
}: {
  group: Group;
  event: NostrEvent;
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
  canReact?: boolean;
  richTextOptions?: RichTextOptions;
  richTextClassnames?: RichTextClassnames;
  className?: string;
  scrollTo?: NostrEvent;
  setScrollTo?: (ev?: NostrEvent) => void;
}) {
  const { t } = useTranslation();
  const [settings] = useSettings();
  const { data: mintList } = useMintList(event.pubkey);
  const reactions = useGroupReactions(group);
  const ndk = useNDK();
  const [showMessageActions, setShowMessageActions] = useState(false);
  const [showingEmojiPicker, setShowingEmojiPicker] = useState(false);
  const [showingZapDialog, setShowingZapDialog] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const lastSeenRef = useRef<HTMLDivElement | null>(null);
  const isMobile = useIsMobile();
  const subject = event.tags.find((t) => t[0] === "subject")?.[1];
  const author = event.pubkey;
  const content = event.content.trim();
  const legacyReply = event.tags.find(
    (t) => t[3] === "reply" || t[3] === "root",
  )?.[1];
  const quotedReply = event.tags.find((t) => t[0] === "q")?.[1];
  const replyTo = legacyReply || quotedReply;
  const replyRoot = event.tags.find((t) => t[3] === "root")?.[1];
  const isReplyingTo = replyTo || replyRoot;
  const isFocused = scrollTo?.id === event.id;
  const me = usePubkey();
  const canSign = useCanSign();
  const isOnlyEmojis =
    /^\p{Emoji_Presentation}{1}\s*\p{Emoji_Presentation}{0,1}$/u.test(content);
  const relayList = useGroupRelays(group);

  const fragments = useRichText(
    content,
    {
      events: true,
      images: true,
      video: true,
      audio: true,
      emojis: true,
      urls: true,
      ecash: true,
    },
    event.tags,
  );
  // Create stable identifier for fragments array
  const fragmentsKey = useMemo(
    () => fragments.map(f => `${f.type}:${f.type === 'block' ? f.nodes.length : 0}`).join('|'),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fragments.length]
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fragmentsKey]);
  const showReply = replyTo && !eventFragmentIds.includes(replyTo);
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
    (!isReplyingTo || !showReply) &&
    !isDeleted;
  const [, copy] = useCopy();

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

  async function react(e: EmojiType) {
    try {
      const ev = new NDKEvent(ndk, {
        kind: NDKKind.Reaction,
        content: e.native ? e.native : e.shortcodes,
      } as NostrEvent);
      ev.tag(new NDKEvent(ndk, event));
      if (e.src) {
        if (e.address) {
          ev.tags.push(["emoji", e.name, e.src, e.address]);
        } else {
          ev.tags.push(["emoji", e.name, e.src]);
        }
      }
      await ev.sign();
      await Promise.all(
        group.pubkeys.map(async (pubkey) => {
          const list = relayList
            .filter((r) => r)
            .find((r) => r!.pubkey === pubkey);
          if (!list) return;
          const relays = list.dm || list.fallback;
          const relaySet = NDKRelaySet.fromRelayUrls(relays, ndk);
          const gift = await giftWrap(ev, new NDKUser({ pubkey }));
          await gift.publish(relaySet);
          if (pubkey === me) {
            await savePrivateEvent(
              ev.rawEvent() as unknown as NostrEvent,
              gift.rawEvent() as unknown as NostrEvent,
            );
          }
        }),
      );
    } catch (err) {
      console.error(err);
      toast.error(t("chat.message.react.error"));
    } finally {
      setShowingEmojiPicker(false);
      setShowMessageActions(false);
    }
  }

  if (subject && !content)
    return (
      <div className="flex flex-row items-center gap-1.5">
        <Pin className="size-3 text-muted-foreground" />
        <span className="text-sm text-muted-foreground line-clamp-1">
          {subject}
        </span>
      </div>
    );
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
            pubkey={author}
            trigger={<Avatar pubkey={author} className="size-7" />}
          />
        )}
        <ContextMenu>
          <ContextMenuTrigger asChild>
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
              {isFirstInChain && !isMine ? (
                <div className="flex flex-row gap-1 items-center">
                  <ProfileDrawer
                    pubkey={author}
                    trigger={
                      <h3 className="text-sm font-semibold">
                        <Name pubkey={author} />
                      </h3>
                    }
                  />
                </div>
              ) : null}
              {(replyTo || (replyRoot && showRootReply)) &&
              isReplyingTo &&
              showReply ? (
                <Reply
                  setScrollTo={setScrollTo}
                  group={group}
                  id={isReplyingTo}
                  className={
                    isMine
                      ? "bg-secondary border-primary/40 text-secondary-foreground"
                      : undefined
                  }
                />
              ) : null}
              {subject ? (
                <div className="flex flex-row items-center gap-1">
                  <Pin className="size-3 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground line-clamp-1">
                    {subject}
                  </span>
                </div>
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
                  tags={event.tags}
                  options={richTextOptions}
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
              {reactions ? (
                <ReactionsList
                  event={event}
                  events={
                    reactions.filter((r) =>
                      r.tags.find((t) => t[1] === event.id),
                    ) as unknown as NostrEvent[]
                  }
                />
              ) : null}
              {showingZapDialog ? (
                <NewZapDialog
                  open
                  event={event}
                  pubkey={event.pubkey}
                  onClose={() => setShowingZapDialog(false)}
                />
              ) : null}
              <LazyEmojiPicker
                open={showingEmojiPicker}
                onOpenChange={(open) => setShowingEmojiPicker(open)}
                onEmojiSelect={react}
              />
              {showMessageActions && canReact ? (
                <div className="flex absolute bottom-0 -right-7 flex-col gap-1">
                  <Button
                    variant="outline"
                    size="smallIcon"
                    onClick={() => setShowingEmojiPicker(true)}
                  >
                    <SmilePlus />
                  </Button>
                </div>
              ) : null}
            </motion.div>
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
              onClick={() => copy(content)}
            >
              {t("chat.message.copy.action")}
              <ContextMenuShortcut>
                <Copy className="w-4 h-4" />
              </ContextMenuShortcut>
            </ContextMenuItem>
            {settings.devMode ? (
              <>
                <ContextMenuSeparator />
                <ContextMenuLabel>{t("chat.debug")}</ContextMenuLabel>
                <ContextMenuItem
                  className="cursor-pointer"
                  onClick={() => console.log(event)}
                >
                  Log
                </ContextMenuItem>
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

// todo
// send encrypted files

type MotionProps = React.ComponentProps<typeof motion.div>;

interface ChatProps extends MotionProps {
  group: Group;
  events: NostrEvent[];
  messageKinds: NDKKind[];
  canDelete?: (event: NostrEvent) => boolean;
  deleteEvent?: (event: NostrEvent) => void;
  components?: Record<
    number,
    React.ComponentType<{
      event: NostrEvent;
      scrollTo?: NostrEvent;
      setScrollTo?: (ev?: NostrEvent) => void;
      setReplyingTo?: (event: NostrEvent) => void;
      deleteEvent?: (event: NostrEvent) => void;
      canDelete?: (event: NostrEvent) => boolean;
      isChain?: boolean;
      isFirstInChain?: boolean;
    }>
  >;
  setReplyingTo?: (event: NostrEvent | undefined) => void;
  className?: string;
  style?: React.CSSProperties;
  scrollTo?: NostrEvent;
  setScrollTo?: (ev?: NostrEvent) => void;
  newMessage?: NostrEvent;
  showRootReply?: boolean;
  lastSeen?: { ref: string };
  deleteEvents: NostrEvent[];
}

export function Chat({
  group,
  events,
  canDelete,
  deleteEvent,
  messageKinds,
  components,
  setReplyingTo,
  style,
  newMessage,
  showRootReply = true,
  className,
  lastSeen,
  deleteEvents = [],
  scrollTo,
  setScrollTo,
}: ChatProps) {
  // todo: check admin events against relay pubkey
  const groupedMessages = groupByDay(events);
  const lastMessage = events.filter((e) => e.kind === NDKKind.GroupChat).at(0);
  const deletedIds = new Set(
    deleteEvents
      .map((e) => e.tags.find((t) => t[0] === "e")?.[1])
      .filter(Boolean),
  );
  const me = usePubkey();

  useEffect(() => {
    return () => setScrollTo?.(undefined);
  }, [group?.id]);

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
          {messages.length > 0 ? (
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
                isDeleted={deletedIds.has(event.id)}
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
              />
            ) : Component ? (
              <Component
                key={event.id}
                event={event}
                setReplyingTo={setReplyingTo}
                scrollTo={scrollTo}
                setScrollTo={setScrollTo}
                isChain={messages[idx + 1]?.pubkey === event.pubkey}
                isFirstInChain={messages[idx - 1]?.pubkey !== event.pubkey}
              />
            ) : event.kind !== NDKKind.Reaction ? (
              <div key={event.id} className="flex flex-col w-full max-w-lg">
                <Embed event={event} canOpenDetails={false} relays={[]} />
              </div>
            ) : null;
          })}
        </div>
      ))}
    </div>
  );
}

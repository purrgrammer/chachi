import { useState, useEffect, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { atom, useAtom } from "jotai";
import { toast } from "sonner";
import {
  Crown,
  Reply as ReplyIcon,
  SmilePlus,
  Copy,
  Trash,
  Ban,
  ShieldBan,
} from "lucide-react";
import { NostrEvent } from "nostr-tools";
import { Button } from "@/components/ui/button";
import { NDKEvent, NDKKind } from "@nostr-dev-kit/ndk";
import { cn } from "@/lib/utils";
import { ProfileDrawer } from "@/components/nostr/profile";
import { Separator } from "@/components/ui/separator";
import { Emoji } from "@/components/emoji";
import { Badge } from "@/components/ui/badge";
import {
  useRichText,
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
import { Zaps, Reactions } from "@/components/nostr/reactions";
import { useIsMobile } from "@/hooks/use-mobile";
import { useNDK } from "@/lib/ndk";
import { Avatar } from "@/components/nostr/avatar";
import { useEvent, useRelaySet } from "@/lib/nostr";
import { useDeletions } from "@/lib/nostr/chat";
import { usePubkey, useCanSign } from "@/lib/account";
import { Emoji as EmojiType, EmojiPicker } from "@/components/emoji-picker";
import {
  useMemoizedLastSeen,
  saveLastSeen,
  saveGroupEvent,
} from "@/lib/messages";
import { useSettings } from "@/lib/settings";
import type { Group } from "@/lib/types";
import { useTranslation } from "react-i18next";
import i18n from "i18next";

const scrollToAtom = atom<string | null>(null);

function Reply({
  group,
  admins,
  id,
  className,
}: {
  group: Group;
  admins: string[];
  id: string;
  className?: string;
}) {
  const { t } = useTranslation();
  // todo: replying to picture, video, mention, custom emoji
  const { data: event } = useEvent({
    id,
    relays: [group.relay],
  });
  const [, setScrollTo] = useAtom(scrollToAtom);
  const isAdmin = event?.pubkey ? admins.includes(event?.pubkey) : false;
  return (
    <div
      className={cn(
        "h-12 p-1 pl-2 border-l-4 rounded-md mb-1 bg-background/80 border-background dark:bg-background/40 dark:border-background/60 cursor-pointer",
        event ? "" : "animate-pulse place-content-center",
        className,
      )}
      onClick={() => setScrollTo(id)}
    >
      {event ? (
        <>
          <div className="flex flex-row gap-1 items-center">
            <h4 className="text-sm font-semibold">
              <Name pubkey={event.pubkey} />
            </h4>
            {isAdmin ? <Crown className="w-3 h-3" /> : null}
          </div>
          <RichText
            group={group}
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
  canReact = true,
  richTextOptions,
  richTextClassnames = {},
  className,
}: {
  group: Group;
  event: NostrEvent;
  admins: string[];
  isChain?: boolean;
  isLastSeen?: boolean;
  isFirstInChain?: boolean;
  isLast?: boolean;
  isDeleted?: boolean;
  setReplyingTo?: (event: NostrEvent | null) => void;
  canDelete?: (ev: NostrEvent) => boolean;
  deleteEvent?: (event: NostrEvent) => void;
  isNew?: boolean;
  isMine?: boolean;
  showRootReply?: boolean;
  canReact?: boolean;
  richTextOptions?: RichTextOptions;
  richTextClassnames?: RichTextClassnames;
  className?: string;
}) {
  const { t } = useTranslation();
  const [settings] = useSettings();
  const relay = group.relay;
  const ndk = useNDK();
  const relaySet = useRelaySet([group.relay]);
  const [scrollTo] = useAtom(scrollToAtom);
  const [showMessageActions, setShowMessageActions] = useState(false);
  const [showingEmojiPicker, setShowingEmojiPicker] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const lastSeenRef = useRef<HTMLDivElement | null>(null);
  const isInView = useInView(ref);
  const isMobile = useIsMobile();
  const author = event.pubkey;
  const content = event.content.trim();
  const legacyReply = event.tags.find((t) => t[3] === "reply")?.[1];
  const quotedReply = event.tags.find((t) => t[0] === "q")?.[1];
  const replyTo = legacyReply || quotedReply;
  const replyRoot = event.tags.find((t) => t[3] === "root")?.[1];
  const isReplyingTo = replyTo || replyRoot;
  const isFocused = scrollTo === event.id;
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
      video: true,
      audio: true,
      emojis: true,
      urls: true,
      ecash: true,
    },
    event.tags,
  );
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
    !isReplyingTo &&
    !isDeleted;

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
      setTimeout(() => {
        ref.current?.scrollIntoView({
          behavior: "smooth",
        });
      }, 0);
    }
  }, [isNew]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(content);
      toast.success(t("chat.message.copy.success"));
    } catch (err) {
      console.error(err);
      toast.error(t("chat.message.copy.error"));
    }
  }

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
        ev.tags.push(["emoji", e.name, e.src]);
      }
      await ev.publish(relaySet);
      if (e.native) {
        // TODO add translation
        toast.success(`Reacted with ${e.native}`);
      } else if (e.src) {
        // nit: info icon
        toast(
          <div className="flex flex-row gap-2 items-center">
            {t("chat.message.react.with")}
            <Emoji
              name={e.name}
              image={e.src}
              className="inline-block w-5 h-5"
            />
          </div>,
        );
      }
    } catch (err) {
      console.error(err);
      toast.error(t("chat.message.react.error"));
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
          ["h", group.id, group.relay],
          ["p", e.pubkey],
        ],
      } as NostrEvent);
      await ev.publish(relaySet);
      toast.success(t("chat.user.kick.success"));
      saveGroupEvent(ev.rawEvent() as NostrEvent, group);
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
            trigger={<Avatar pubkey={author} className="size-8" />}
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
                  if (canReact) {
                    setShowingEmojiPicker(true);
                  }
                }
              }}
              className={`relative ${isChain ? "rounded-lg" : isMine ? "rounded-tl-lg rounded-tr-lg rounded-bl-lg" : "rounded-tl-lg rounded-tr-lg rounded-br-lg"} p-1 px-2 w-fit max-w-[18rem] sm:max-w-sm md:max-w-md ${isMine ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"} ${isChain && !isMine ? "ml-10" : ""} ${shouldHaveTransparentBackground ? "bg-transparent p-0" : ""}`}
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
              {(replyTo || (replyRoot && showRootReply)) && isReplyingTo ? (
                <Reply
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
                    className={`w-32 h-32 aspect-auto rounded-md`}
                  />
                </div>
              ) : (
                <RichText
                  group={group}
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
              <div className="space-y-1">
                <Zaps
                  event={event}
                  relays={[...(relay ? [relay] : [])]}
                  live={true}
                  className="pt-1"
                />
                <Reactions
                  event={event}
                  relays={[...(relay ? [relay] : [])]}
                  live={isInView}
                />
              </div>
              {showingEmojiPicker ? (
                <EmojiPicker
                  open={showingEmojiPicker}
                  onOpenChange={(open) => setShowingEmojiPicker(open)}
                  onEmojiSelect={react}
                >
                  <div className="pointer-events-none">
                    <ChatMessage
                      group={group}
                      event={event}
                      admins={admins}
                      canReact={false}
                      isFirstInChain={true}
                      richTextOptions={{
                        images: false,
                        video: false,
                        audio: false,
                        events: false,
                      }}
                      richTextClassnames={{ paragraphs: "break-all" }}
                    />
                  </div>
                </EmojiPicker>
              ) : null}
              {showMessageActions ? (
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
            <ContextMenuItem className="cursor-pointer" onClick={() => copy()}>
              {t("chat.message.copy.action")}
              <ContextMenuShortcut>
                <Copy className="w-4 h-4" />
              </ContextMenuShortcut>
            </ContextMenuItem>
            {amIAdmin && event.pubkey !== me ? (
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
                <ContextMenuItem
                  className="cursor-pointer"
                  onClick={() => saveLastSeen(event, group)}
                >
                  {t("chat.message.save-as-last-seen")}
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
// join/request access
// message transition
// threads
// zaps
// emoji reactions
// autocomplete emoji
// deletes
//  - admin
//  - user

interface GroupedByDay {
  day: string;
  messages: NostrEvent[];
}

function groupByDay(events: NostrEvent[]): GroupedByDay[] {
  return events.reduce((acc, event) => {
    const date = new Date(event.created_at * 1000);
    const day = `${date.getMonth()}/${date.getDate()}/${date.getFullYear()}`;
    const lastGroup = acc[acc.length - 1] || {};
    if (lastGroup.day === day) {
      lastGroup.messages.unshift(event);
    } else {
      acc.push({ day, messages: [event] });
    }
    return acc;
  }, [] as GroupedByDay[]);
}

function formatDay(date: string) {
  const currentYear = new Date().getFullYear();
  const [month, day, year] = date.split("/");
  const today = new Date();
  if (
    today.getMonth() === Number(month) &&
    today.getDate() === Number(day) &&
    today.getFullYear() === Number(year)
  ) {
    return i18n.t("locale.today");
  }
  return Intl.DateTimeFormat(i18n.t("locale.code"), {
    day: "numeric",
    month: "long",
    year: currentYear === Number(year) ? undefined : "numeric",
  }).format(new Date(Number(year), Number(month), Number(day)));
}

type MotionProps = React.ComponentProps<typeof motion.div>;

interface ChatProps extends MotionProps {
  group: Group;
  events: NostrEvent[];
  admins: string[];
  messageKinds: NDKKind[];
  canDelete?: (event: NostrEvent) => boolean;
  deleteEvent?: (event: NostrEvent) => void;
  components?: Record<number, React.ComponentType<{ event: NostrEvent }>>;
  setReplyingTo?: (event: NostrEvent | null) => void;
  className?: string;
  style?: React.CSSProperties;
  newMessage?: NostrEvent;
  showRootReply?: boolean;
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
  className,
}: ChatProps) {
  // todo: check admin events against relay pubkey
  const groupedMessages = groupByDay(events);
  const lastSeen = useMemoizedLastSeen(group);
  const lastMessage = events.filter((e) => e.kind === NDKKind.GroupChat).at(0);
  const [, setScrollTo] = useAtom(scrollToAtom);
  const { events: deleteEvents } = useDeletions(group);
  const deletedIds = new Set(
    deleteEvents
      .map((e) => e.tags.find((t) => t[0] === "e")?.[1])
      .filter(Boolean),
  );
  const me = usePubkey();

  useEffect(() => {
    return () => setScrollTo(null);
  }, [group.id, group.relay]);

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
                admins={admins}
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
              />
            ) : Component ? (
              <Component key={event.id} event={event} />
            ) : null;
          })}
        </div>
      ))}
    </div>
  );
}

import { useState } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Maximize,
  Bitcoin,
  Reply,
  SmilePlus,
  Trash,
  Ellipsis,
  MessageSquareShare,
  Ban,
} from "lucide-react";
import { NewZapDialog } from "@/components/nostr/zap";
import { NDKRelaySet } from "@nostr-dev-kit/ndk";
import { NostrEvent } from "nostr-tools";
import { Empty } from "@/components/empty";
import { Name } from "@/components/nostr/name";
import { Loading } from "@/components/loading";
import { useNavigate } from "react-router-dom";
import { NDKEvent, NDKKind } from "@nostr-dev-kit/ndk";
import {
  RichText,
  RichTextOptions,
  RichTextClassnames,
} from "@/components/rich-text";
import { Button } from "@/components/ui/button";
import { ChatBubble, ChatBubbleDetail } from "@/components/nostr/chat-bubble";
import { Header } from "@/components/nostr/header";
import { Reactions } from "@/components/nostr/reactions";
import { Book, BookContent } from "@/components/nostr/book";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/nav-tabs";
import { Post, PostWithReplies } from "@/components/nostr/post";
import { HorizontalVideo, VerticalVideo } from "@/components/nostr/video";
import { Image } from "@/components/nostr/image";
import { AutocompleteTextarea } from "@/components/autocomplete-textarea";
import { ArticleSummary, Article } from "@/components/nostr/article";
import {
  GroupMetadata,
  GroupName,
  GroupPicture,
} from "@/components/nostr/groups/metadata";
import { ZapPreview, ZapDetail } from "@/components/nostr/zap";
//import { ZapGoal } from "@/components/nostr/zap-goal";
import { NutzapPreview, NutzapDetail } from "@/components/nostr/nutzap";
import { Repo, Issues } from "@/components/nostr/repo";
import { Highlight } from "@/components/nostr/highlight";
import { Stream } from "@/components/nostr/stream";
import People from "@/components/nostr/people";
import { EmojiSet } from "@/components/nostr/emoji-set";
import { GIFSet } from "@/components/nostr/gif-set";
import Reaction from "@/components/nostr/reaction";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuShortcut,
} from "@/components/ui/context-menu";
import { Emoji as PickerEmoji, EmojiPicker } from "@/components/emoji-picker";
import { Poll, PollResults } from "@/components/nostr/poll";
import { CalendarEvent } from "@/components/nostr/calendar";
import { ReplyDialog } from "@/components/nostr/reply";
import { useMintList } from "@/lib/cashu";
import { getRelayHost } from "@/lib/relay";
import { useNDK } from "@/lib/ndk";
import { useRelaySet, useRelays } from "@/lib/nostr";
import { useReplies } from "@/lib/nostr/comments";
import { useGroupAdminsList } from "@/lib/nostr/groups";
import { useOpenGroup, groupId } from "@/lib/groups";
import { MintEventPreview, MintEventDetail } from "@/components/mint";
import {
  POLL,
  REPO,
  ISSUE,
  COMMENT,
  STREAM,
  CALENDAR_EVENT,
  GIF_SET,
  //GOAL,
  BOOK,
  //BOOK_CONTENT,
  CASHU_MINT,
} from "@/lib/kinds";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { WikiPreview, WikiDetail } from "@/components/nostr/wiki";
import { useSortedGroups, saveGroupEvent } from "@/lib/messages";
import { usePubkey, useCanSign } from "@/lib/account";
import type { Group, Emoji as EmojiType } from "@/lib/types";
import { useTranslation } from "react-i18next";

type EventComponent = (props: {
  event: NostrEvent;
  relays: string[];
  group?: Group;
  options?: RichTextOptions;
  classNames?: RichTextClassnames;
}) => JSX.Element | null;

// todo: events with no header or alternative author (group metadata, zap?, stream)
const eventDetails: Record<
  number,
  {
    noHeader?: boolean;
    className?: string;
    innerClassname?: string;
    preview: EventComponent;
    detail: EventComponent;
    content?: EventComponent;
  }
> = {
  [NDKKind.Text]: {
    preview: PostWithReplies,
    detail: Post,
  },
  [COMMENT]: {
    preview: PostWithReplies,
    detail: Post,
  },
  [NDKKind.GroupNote]: {
    preview: PostWithReplies,
    detail: Post,
  },
  [NDKKind.GroupChat]: {
    noHeader: true,
    className: "border-none",
    innerClassname: "pt-2 pb-0 px-2",
    preview: ChatBubble,
    detail: ChatBubbleDetail,
  },
  [NDKKind.GroupReply]: {
    preview: PostWithReplies,
    detail: Post,
  },
  [NDKKind.GroupMetadata]: {
    noHeader: true,
    preview: GroupMetadata,
    detail: GroupMetadata,
  },
  [NDKKind.Highlight]: {
    preview: Highlight,
    detail: Highlight,
  },
  [NDKKind.Article]: {
    preview: ArticleSummary,
    detail: ArticleSummary,
    content: Article,
  },
  [NDKKind.EmojiSet]: {
    preview: EmojiSet,
    detail: EmojiSet,
  },
  [GIF_SET]: {
    innerClassname: "pb-0",
    preview: GIFSet,
    detail: GIFSet,
  },
  [POLL]: {
    preview: Poll,
    detail: Poll,
    content: PollResults,
  },
  [REPO]: {
    preview: Repo,
    detail: Repo,
    content: Issues,
  },
  [ISSUE]: {
    preview: PostWithReplies,
    detail: Post,
  },
  [NDKKind.HorizontalVideo]: {
    preview: HorizontalVideo,
    detail: HorizontalVideo,
  },
  [NDKKind.VerticalVideo]: {
    preview: VerticalVideo,
    detail: VerticalVideo,
  },
  [NDKKind.Image]: {
    preview: Image,
    detail: Image,
  },
  [NDKKind.Zap]: {
    noHeader: true,
    className:
      "relative rounded-md bg-background/80 border-none my-0.5 border-gradient",
    preview: ZapPreview,
    detail: ZapDetail,
  },
  //[GOAL]: {
  //  preview: ZapGoal,
  //  detail: ZapGoal,
  //},
  [NDKKind.Nutzap]: {
    noHeader: true,
    className: "relative rounded-md bg-background/80 border-none my-0.5",
    preview: NutzapPreview,
    detail: NutzapDetail,
  },
  [BOOK]: {
    preview: Book,
    detail: Book,
    content: BookContent,
  },
  [STREAM]: {
    preview: Stream,
    detail: Stream,
  },
  [NDKKind.CategorizedPeopleList]: {
    preview: People,
    detail: People,
  },
  [CALENDAR_EVENT]: {
    preview: CalendarEvent,
    detail: CalendarEvent,
  },
  [NDKKind.Reaction]: {
    noHeader: true,
    preview: Reaction,
    detail: Reaction,
  },
  [NDKKind.Wiki]: {
    preview: WikiPreview,
    detail: WikiDetail,
  },
  [CASHU_MINT]: {
    noHeader: true,
    preview: MintEventPreview,
    detail: MintEventDetail,
  },
};

function ShareDialog({
  event,
  relays,
  group,
  open,
  onOpenChange,
}: {
  event: NostrEvent;
  relays: string[];
  group: Group;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const ndk = useNDK();
  const [message, setMessage] = useState("");
  const [customEmoji, setCustomEmoji] = useState<EmojiType[]>([]);
  const openGroup = useOpenGroup(group);
  const { t } = useTranslation();

  function onClose(open: boolean) {
    if (!open) {
      setMessage("");
      setCustomEmoji([]);
    }
    onOpenChange(open);
  }

  async function shareEvent() {
    try {
      const ndkEvent = new NDKEvent(ndk, event);
      // @ts-expect-error encode takes relay list but type is wrong
      const nlink = ndkEvent.encode(relays);
      const ev = new NDKEvent(ndk, {
        kind: NDKKind.GroupChat,
        content: message ? `${message}\nnostr:${nlink}` : `nostr:${nlink}`,
        tags: [["h", group.id, group.relay]],
      } as NostrEvent);
      ev.tag(ndkEvent);
      for (const e of customEmoji) {
        ev.tags.push(["emoji", e.name, e.image!]);
      }
      await ev.publish(NDKRelaySet.fromRelayUrls([group.relay], ndk));
      saveGroupEvent(ev.rawEvent() as NostrEvent, group);
      onClose(false);
      toast.success(t("share.success"));
      openGroup();
    } catch (err) {
      console.error(err);
      toast.error(t("share.error"));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t("share.publication")}</DialogTitle>
          {group ? (
            <DialogDescription>
              {t("share.in.group")}{" "}
              <div className="flex flex-row items-center gap-1">
                <GroupPicture group={group} className="size-5" />
                <GroupName group={group} />
              </div>
            </DialogDescription>
          ) : (
            <DialogDescription>{t("share.this.publication")}</DialogDescription>
          )}
        </DialogHeader>
        <AutocompleteTextarea
          group={group}
          message={message}
          setMessage={setMessage}
          onCustomEmojisChange={(custom) =>
            setCustomEmoji([...customEmoji, ...custom])
          }
          minRows={3}
          maxRows={6}
          submitOnEnter={false}
          placeholder={t("write-a-message")}
        />
        <DialogFooter>
          <Button className="overflow-x-hidden w-full" onClick={shareEvent}>
            <div className="flex flex-row items-center gap-1">
              <MessageSquareShare />
              {t("share-in")}
              <GroupPicture group={group} className="size-4" />{" "}
              <GroupName group={group} />
            </div>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EventMenu({
  event,
  group,
  relays = [],
  canOpen,
}: {
  event: NostrEvent;
  group?: Group;
  relays: string[];
  canOpen?: boolean;
}) {
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [shareGroup, setShareGroup] = useState<Group | undefined>(group);
  const ndk = useNDK();
  const navigate = useNavigate();
  const groups = useSortedGroups();
  const isGroupEvent =
    group &&
    group.id !== "_" &&
    event.tags.find((t) => t[0] === "h")?.[1] === group.id;
  const { t } = useTranslation();
  const [showZapDialog, setShowZapDialog] = useState(false);
  const { data: mintList } = useMintList(event.pubkey);

  function showDetail() {
    const ev = new NDKEvent(ndk, event);
    // @ts-expect-error for some reason it thinks this function takes a number
    const nlink = ev.encode(relays);
    const prefix = group ? `/${getRelayHost(group.relay)}` : "";
    const url = `${prefix}/e/${nlink}`;
    navigate(url);
  }

  function shareIn(group: Group) {
    setShareGroup(group);
    setShowShareDialog(true);
  }

  return (
    <>
      {showZapDialog ? (
        <NewZapDialog
          open={showZapDialog}
          onClose={() => setShowZapDialog(false)}
          event={event}
          pubkey={event.pubkey}
          group={group}
          onZap={() => setShowZapDialog(false)}
          zapType={mintList?.pubkey ? "nip-61" : "nip-57"}
        />
      ) : null}
      {shareGroup ? (
        <ShareDialog
          open={showShareDialog}
          onOpenChange={setShowShareDialog}
          event={event}
          group={shareGroup}
          relays={relays}
        />
      ) : null}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <Ellipsis />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          <DropdownMenuGroup>
            {canOpen ? (
              <DropdownMenuItem onClick={showDetail}>
                <Maximize />
                <span>{t("action-open")}</span>
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem onClick={() => setShowZapDialog(true)}>
              <Bitcoin />
              <span>{t("action-zap")}</span>
            </DropdownMenuItem>
            {isGroupEvent && group ? (
              <DropdownMenuItem onClick={() => shareIn(group)}>
                <MessageSquareShare />
                {group ? (
                  <div className="flex flex-row items-center gap-1.5 line-clamp-1">
                    {t("share-in")}
                    <div className="flex flex-row items-center gap-1">
                      <GroupPicture group={group} className="size-4" />{" "}
                      <GroupName group={group} />
                    </div>
                  </div>
                ) : (
                  <span className="line-clamp-1">{t("share.in.chat")}</span>
                )}
              </DropdownMenuItem>
            ) : (
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="gap-2">
                  <MessageSquareShare className="size-4" />
                  <span>{t("share-in")}</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent>
                    {groups.map((g) => (
                      <DropdownMenuItem
                        key={groupId(g)}
                        onClick={() => shareIn(g)}
                      >
                        <GroupPicture group={g} className="size-5" />
                        <GroupName group={g} />
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
            )}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

// todo: delete item when not group
function DeleteGroupEventItem({
  event,
  group,
  onDelete,
}: {
  event: NostrEvent;
  group: Group;
  onDelete: () => void;
}) {
  const ndk = useNDK();
  const me = usePubkey();
  const { data: admins } = useGroupAdminsList(group);
  const { t } = useTranslation();
  const relaySet = useRelaySet([group.relay]);
  const canDelete = me && (me === event.pubkey || admins?.includes(me));

  async function handleDelete() {
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
      toast.success(t("post.delete.success"));
      onDelete();
    } catch (err) {
      console.error(err);
      toast.error(t("post.delete.error"));
    }
  }

  return canDelete ? (
    <ContextMenuItem className="cursor-pointer" onClick={handleDelete}>
      {t("chat.message.delete.action")}
      <ContextMenuShortcut>
        <Trash className="w-4 h-4 text-destructive" />
      </ContextMenuShortcut>
    </ContextMenuItem>
  ) : null;
}

function AsReply({
  event,
  group,
  className,
  onClick,
}: {
  event: NostrEvent;
  group?: Group;
  className?: string;
  onClick?: (ev: NostrEvent) => void;
}) {
  return (
    <div
      className={cn(
        "h-12 p-1 pl-2 border-l-4 rounded-md mb-1 bg-background/80 border-background dark:bg-background/40 dark:border-background/60",
        onClick ? "cursor-pointer" : "",
        className,
      )}
      onClick={onClick ? () => onClick(event) : undefined}
    >
      <h4 className="text-sm font-semibold">
        <Name pubkey={event.pubkey} />
      </h4>
      <RichText
        group={group}
        tags={event.tags}
        options={{
          inline: true,
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
        className="break-all line-clamp-1"
      >
        {event.content}
      </RichText>
    </div>
  );
}

export function FeedEmbed({
  event,
  group,
  className,
  classNames,
  canOpenDetails = false,
  showReactions = true,
  options = {},
  relays = [],
}: {
  event: NostrEvent;
  group?: Group;
  className?: string;
  canOpenDetails?: boolean;
  showReactions?: boolean;
  options?: RichTextOptions;
  classNames?: RichTextClassnames;
  relays: string[];
}) {
  const ndk = useNDK();
  const userRelays = useRelays();
  const canSign = useCanSign();
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showReplyDialog, setShowReplyDialog] = useState(false);
  const [zapType, setZapType] = useState<"nip-57" | "nip-61">("nip-61");
  const [showZapDialog, setShowZapDialog] = useState(false);
  const components = eventDetails[event.kind];
  const [isDeleted, setIsDeleted] = useState(false);
  const relaySet = useRelaySet(group ? [group.relay] : userRelays);
  // NIP-31
  const alt = event.tags.find((t) => t[0] === "alt")?.[1];
  const { t } = useTranslation();
  const isRelayGroup = group?.id === "_";
  const { data: mintList } = useMintList(event.pubkey);

  function openEmojiPicker() {
    setShowEmojiPicker(true);
  }

  function openReplyDialog() {
    setShowReplyDialog(true);
  }

  function openZapDialog(type: "nip-61" | "nip-57") {
    setZapType(type);
    setShowZapDialog(true);
  }

  async function onReply(content: string, tags: string[][]) {
    try {
      // todo: reply to `a` or `i` tags
      const ndkEvent = new NDKEvent(ndk, event);
      const [t, ref] = ndkEvent.tagReference();
      const root = event.tags.find(
        (t) => t[0] === "E" || t[0] === "A" || t[0] === "I",
      );
      const rootTag = root?.[0] ?? t.toUpperCase();
      const rootKind =
        event.tags.find((t) => t[0] === "K")?.[1] ?? String(event.kind);
      const rootRef = root ? root[1] : ref;
      const rootRelay = root ? root[2] : (group?.relay ?? "");
      const rootPubkey = root ? root[3] : event.pubkey;
      const ev = new NDKEvent(ndk, {
        kind: COMMENT,
        content,
        tags: [
          ...(group ? [["h", group.id, group.relay]] : []),
          ...(group && group.id === "_" ? [["-"]] : []),
          // root marker
          rootTag === "E"
            ? [rootTag, rootRef, rootRelay, rootPubkey]
            : [rootTag, rootRef, rootRelay],
          ["K", rootKind],
          // parent item
          t === "e"
            ? [t, ref, group ? group.relay : "", event.pubkey]
            : [t, ref, group ? group.relay : ""],
          ["k", String(event.kind)],
          ...tags,
        ],
      } as NostrEvent);
      ev.tag(ndkEvent);
      await ev.publish(relaySet);
    } catch (err) {
      console.error(err);
      toast.error(t("chat.message.reply.error"));
    } finally {
      setShowReplyDialog(false);
    }
  }

  async function onEmojiSelect(e: PickerEmoji) {
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
      setShowEmojiPicker(false);
    }
  }

  const header = components?.noHeader ? null : (
    <div className="flex gap-3 items-center py-2 px-3 space-between">
      <Header event={event} />
      <EventMenu
        event={event}
        group={group}
        relays={relays}
        canOpen={canOpenDetails}
      />
    </div>
  );

  const body = (
    <div className={cn("py-1 px-4 pb-2 space-y-3", components?.className)}>
      {components?.preview ? (
        components.preview({
          event,
          relays,
          group,
          options,
          classNames,
        })
      ) : alt ? (
        <p>{alt}</p>
      ) : (
        <RichText
          options={options}
          group={group}
          tags={event.tags}
          classNames={classNames}
        >
          {event.content}
        </RichText>
      )}
      {showReactions ? (
        <Reactions
          event={event}
          relays={group ? [group.relay] : [...relays, ...userRelays]}
          kinds={[NDKKind.Zap, NDKKind.Nutzap, NDKKind.Reaction]}
        />
      ) : null}
    </div>
  );

  // todo: emojis show before dragging
  return (
    <div className="relative rounded-sm bg-accent">
      <motion.div
        className={cn(
          "z-10 border relative bg-background text-foreground rounded-sm font-sans",
          components?.className,
          className,
        )}
        // Drag controls
        drag={canSign && !isDeleted ? "x" : false}
        dragSnapToOrigin={true}
        dragConstraints={{ left: 30, right: 30 }}
        dragElastic={{ left: 0.2, right: 0.2 }}
        onDragEnd={(_, info) => {
          // todo: tweak offsets
          if (info.offset.x > 200) {
            openReplyDialog();
          } else if (info.offset.x < -200) {
            openEmojiPicker();
          }
        }}
      >
        {canSign ? (
          <ContextMenu>
            <ContextMenuTrigger>
              {header}
              {isDeleted ? (
                <div className="py-2 px-4 space-y-3">
                  <div className="flex flex-row gap-1 items-center text-muted-foreground">
                    <Ban className="size-3" />
                    <span className="text-xs italic">
                      {t("post.delete.success")}
                    </span>
                  </div>
                </div>
              ) : (
                body
              )}
            </ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuItem
                className="cursor-pointer"
                onClick={openReplyDialog}
              >
                {t("chat.message.reply.action")}
                <ContextMenuShortcut>
                  <Reply className="w-4 h-4" />
                </ContextMenuShortcut>
              </ContextMenuItem>
              <ContextMenuItem
                className="cursor-pointer"
                onClick={openEmojiPicker}
              >
                {t("chat.message.react.action")}
                <ContextMenuShortcut>
                  <SmilePlus className="w-4 h-4" />
                </ContextMenuShortcut>
              </ContextMenuItem>
              {isRelayGroup ? (
                <ContextMenuItem
                  className="cursor-pointer"
                  onClick={() => openZapDialog("nip-57")}
                >
                  {t("chat.message.zap.action")}
                  <ContextMenuShortcut>
                    <Bitcoin className="w-4 h-4" />
                  </ContextMenuShortcut>
                </ContextMenuItem>
              ) : mintList?.pubkey ? (
                <ContextMenuItem
                  className="cursor-pointer"
                  onClick={() => openZapDialog("nip-61")}
                >
                  {t("chat.message.zap.action")}
                  <ContextMenuShortcut>
                    <Bitcoin className="w-4 h-4" />
                  </ContextMenuShortcut>
                </ContextMenuItem>
              ) : null}
              {group ? (
                <DeleteGroupEventItem
                  event={event}
                  group={group}
                  onDelete={() => setIsDeleted(true)}
                />
              ) : null}
            </ContextMenuContent>
          </ContextMenu>
        ) : (
          <>
            {header}
            {isDeleted ? (
              <div className="py-2 px-4 space-y-3">
                <div className="flex flex-row gap-1 items-center text-muted-foreground">
                  <Ban className="size-3" />
                  <span className="text-xs italic">
                    {t("post.delete.success")}
                  </span>
                </div>
              </div>
            ) : (
              body
            )}
          </>
        )}
      </motion.div>
      {isDeleted ? null : (
        <>
          <Reply className="absolute left-2 top-3 z-0 size-6" />
          <SmilePlus className="absolute right-2 top-3 z-0 size-6" />
        </>
      )}
      {showZapDialog ? (
        <NewZapDialog
          open={showZapDialog}
          onZap={() => setShowZapDialog(false)}
          onClose={() => setShowZapDialog(false)}
          event={event}
          pubkey={event.pubkey}
          group={group}
          zapType={zapType}
        />
      ) : null}
      {showEmojiPicker && canSign ? (
        <EmojiPicker
          open={showEmojiPicker}
          onOpenChange={setShowEmojiPicker}
          onEmojiSelect={onEmojiSelect}
        />
      ) : null}
      {showReplyDialog && canSign ? (
        <ReplyDialog
          group={group}
          open={showReplyDialog}
          onOpenChange={setShowReplyDialog}
          onReply={onReply}
        >
          <Embed
            canOpenDetails={false}
            showReactions={false}
            event={event}
            group={group}
            relays={relays}
            className="overflow-y-auto overflow-x-hidden max-h-32 rounded-b-none border-none pretty-scrollbar"
          />
        </ReplyDialog>
      ) : null}
    </div>
  );
}

export function Embed({
  event,
  group,
  className,
  classNames,
  isDetail = false,
  canOpenDetails = true,
  showReactions = true,
  options = {},
  relays = [],
  asReply = false,
  onClick,
}: {
  event: NostrEvent;
  group?: Group;
  className?: string;
  canOpenDetails?: boolean;
  isDetail?: boolean;
  showReactions?: boolean;
  options?: RichTextOptions;
  classNames?: RichTextClassnames;
  relays: string[];
  asReply?: boolean;
  onClick?: (ev: NostrEvent) => void;
}) {
  const userRelays = useRelays();
  const components = eventDetails[event.kind];
  // NIP-31
  const alt = event.tags.find((t) => t[0] === "alt")?.[1];
  if (asReply) {
    return (
      <AsReply
        event={event}
        group={group}
        className={className}
        onClick={onClick}
      />
    );
  }
  return (
    <div
      className={cn(
        "border bg-background text-foreground rounded-sm font-sans",
        components?.className,
        className,
      )}
    >
      {components?.noHeader ? null : (
        <div className="flex gap-3 items-center py-2 px-3 space-between">
          <Header event={event} />
          <EventMenu
            event={event}
            group={group}
            relays={relays}
            canOpen={canOpenDetails}
          />
        </div>
      )}
      <div
        className={cn(
          "flex flex-col gap-1 py-1 px-4 pb-2",
          components?.innerClassname,
        )}
      >
        {isDetail && components?.detail ? (
          components.detail({ event, relays, group, options, classNames })
        ) : components?.preview ? (
          components.preview({ event, relays, group, options, classNames })
        ) : alt ? (
          <p>{alt}</p>
        ) : (
          <RichText
            options={options}
            group={group}
            tags={event.tags}
            classNames={classNames}
          >
            {event.content}
          </RichText>
        )}
        {showReactions ? (
          <Reactions
            event={event}
            relays={group ? [group.relay] : [...relays, ...userRelays]}
            kinds={[NDKKind.Zap, NDKKind.Nutzap, NDKKind.Reaction]}
          />
        ) : null}
      </div>
    </div>
  );
}

export function EventDetail({
  event,
  group,
  relays,
}: {
  event: NostrEvent;
  group?: Group;
  relays: string[];
}) {
  const { eose, events: comments } = useReplies(event, group);
  const hasContent = eventDetails[event.kind]?.content;
  const { t } = useTranslation();

  return (
    <div
      className="
      flex
      items-center
      justify-center
      p-0
	  w-[100vw]
md:w-[calc(100vw-16rem)]
	  group-has-[[data-collapsible=icon]]/sidebar-wrapper:w-[calc(100vw-4rem)]"
    >
      <div className="w-full max-w-xl">
        <Embed
          isDetail
          event={event}
          group={group}
          className="border-none"
          canOpenDetails={false}
          classNames={{
            video: "w-full w-96 mx-auto",
            image: "w-full w-96 mx-auto",
            events: "w-full max-w-96 mx-auto",
          }}
          relays={relays}
        />
        <Tabs defaultValue={hasContent ? "content" : "replies"}>
          <TabsList className="px-4 border-t">
            {hasContent ? (
              <TabsTrigger value="content">{t("event.content")}</TabsTrigger>
            ) : null}
            <TabsTrigger value="replies">{t("event.replies")}</TabsTrigger>
            <TabsTrigger value="details">{t("event.details")}</TabsTrigger>
          </TabsList>
          {hasContent ? (
            <TabsContent value="content">
              <div className="py-2 px-4">
                {eventDetails[event.kind]?.content?.({
                  event,
                  relays,
                  group,
                })}
              </div>
            </TabsContent>
          ) : null}
          <TabsContent value="replies">
            <AnimatePresence initial={false}>
              {comments.length === 0 && !eose ? (
                <Loading className="my-16" />
              ) : null}
              {comments.length === 0 && eose ? (
                <Empty className="my-16" />
              ) : null}
              {comments.map((comment) => (
                // todo: subthreads as chat on click
                <FeedEmbed
                  canOpenDetails
                  key={comment.id}
                  event={comment}
                  group={group}
                  className="rounded-none border-b border-l-none border-t-none border-r-none"
                  relays={relays}
                />
              ))}
            </AnimatePresence>
          </TabsContent>
          <TabsContent value="details">
            <div className="flex flex-col gap-3 py-3 px-4">
              <pre className="p-2 text-xs whitespace-pre-wrap break-words rounded-sm border">
                {JSON.stringify(event, null, 2)}
              </pre>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

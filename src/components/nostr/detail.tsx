import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import CodeSnippet from "@/components/nostr/code-snippet";
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
// todo: lazily load components
import { Empty } from "@/components/empty";
import { Name } from "@/components/nostr/name";
import Badge from "@/components/nostr/badge";
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
import { TargetedPublication } from "@/components/nostr/targeted-publication";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/nav-tabs";
import { Post, PostDetail } from "@/components/nostr/post";
import { HorizontalVideo, VerticalVideo } from "@/components/nostr/video";
import { Image } from "@/components/nostr/image";
import { AutocompleteTextarea } from "@/components/autocomplete-textarea";
import { ArticleSummary, Article } from "@/components/nostr/article";
import {
  GroupMetadata,
  CommunityMetadata,
  GroupName,
  GroupPicture,
} from "@/components/nostr/groups/metadata";
import { ZapPreview, ZapDetail, ZapReply } from "@/components/nostr/zap";
import {
  NutzapPreview,
  NutzapDetail,
  NutzapReply,
} from "@/components/nostr/nutzap";
import { Repo, Issues } from "@/components/nostr/repo";
import { Highlight } from "@/components/nostr/highlight";
import { Stream } from "@/components/nostr/stream";
import People from "@/components/nostr/people";
import EmojiSet from "@/components/nostr/emoji-set";
import { GIFSet } from "@/components/nostr/gif-set";
import Reaction from "@/components/nostr/reaction";
import { Thread } from "@/components/nostr/thread";
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
import { eventLink } from "@/lib/links";
import { useNDK } from "@/lib/ndk";
import { useRelaySet, useRelays } from "@/lib/nostr";
import { useDirectReplies, useReplies } from "@/lib/nostr/comments";
import { useGroupAdminsList } from "@/lib/nostr/groups";
import { useOpenGroup, groupId } from "@/lib/groups";
import { MintEventPreview, MintEventDetail } from "@/components/mint";
import {
  POLL,
  REPO,
  ISSUE,
  COMMENT,
  GOAL,
  STREAM,
  CALENDAR_EVENT,
  GIF_SET,
  BOOK,
  CASHU_MINT,
  COMMUNIKEY,
  CODE_SNIPPET,
  WORKOUT,
  TARGETED_PUBLICATION,
  FOLLOW_PACK,
  MODERATED_COMMUNITY,
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
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { WikiPreview, WikiDetail } from "@/components/nostr/wiki";
import {
  ModeratedCommunitiesPreview,
  ModeratedCommunitiesContent,
} from "@/components/nostr/moderated-communities";
import { useSortedGroups, saveGroupEvent } from "@/lib/messages";
import { usePubkey, useCanSign } from "@/lib/account";
import type { Group, Emoji as EmojiType } from "@/lib/types";
import { useTranslation } from "react-i18next";
import { LazyCodeBlock } from "@/components/lazy-code-block";
import { NameList } from "@/components/nostr//name-list";
import { ZapGoal } from "./zap-goal";
import { Workout } from "./workout";
//import { WorkoutTemplate } from "./workout-template";
import { AppDefinition, AppRecommendation } from "@/components/nostr/nip-89";
import RelayList from "./relay-list";

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
    inline?: boolean;
    className?: string;
    innerClassname?: string;
    preview: EventComponent; // when an event appears mentioned in a post
    reply?: EventComponent; // when an event appears as a reply
    detail: EventComponent; // when an event is opened in detail
    content?: EventComponent; // the content of an event detail
  }
> = {
  [NDKKind.Text]: {
    preview: Post,
    detail: PostDetail,
  },
  [COMMENT]: {
    preview: Post,
    detail: PostDetail,
  },
  [GOAL]: {
    preview: ZapGoal,
    detail: ZapGoal,
  },
  [NDKKind.GroupNote]: {
    preview: Post,
    detail: PostDetail,
  },
  [NDKKind.GroupChat]: {
    noHeader: true,
    className: "border-none",
    innerClassname: "pt-2 pb-0 px-2",
    preview: ChatBubble,
    detail: ChatBubbleDetail,
  },
  [NDKKind.GroupReply]: {
    preview: Post,
    detail: PostDetail,
  },
  [NDKKind.GroupMetadata]: {
    noHeader: true,
    preview: GroupMetadata,
    detail: GroupMetadata,
  },
  [COMMUNIKEY]: {
    noHeader: true,
    preview: CommunityMetadata,
    detail: CommunityMetadata,
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
    preview: Post,
    detail: PostDetail,
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
    className: "relative rounded-md bg-background/80 border-none my-0.5",
    preview: ZapPreview,
    detail: ZapDetail,
    reply: ZapReply,
  },
  [NDKKind.Nutzap]: {
    noHeader: true,
    className: "relative rounded-md bg-background/80 border-none my-0.5",
    preview: NutzapPreview,
    detail: NutzapDetail,
    reply: NutzapReply,
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
  [FOLLOW_PACK]: {
    preview: People,
    detail: People,
  },
  [CALENDAR_EVENT]: {
    preview: CalendarEvent,
    detail: CalendarEvent,
  },
  [NDKKind.Reaction]: {
    preview: Reaction,
    detail: Reaction,
  },
  [NDKKind.Wiki]: {
    preview: WikiPreview,
    detail: WikiPreview,
    content: WikiDetail,
  },
  [CASHU_MINT]: {
    noHeader: true,
    preview: MintEventPreview,
    detail: MintEventDetail,
  },
  [CODE_SNIPPET]: {
    preview: CodeSnippet,
    detail: CodeSnippet,
  },
  [WORKOUT]: {
    preview: Workout,
    detail: Workout,
  },
  //[WORKOUT_TEMPLATE]: {
  //  preview: WorkoutTemplate,
  //  detail: WorkoutTemplate,
  //},
  [NDKKind.AppHandler]: {
    preview: AppDefinition,
    detail: AppDefinition,
  },
  [NDKKind.AppRecommendation]: {
    preview: AppRecommendation,
    detail: AppRecommendation,
  },
  [TARGETED_PUBLICATION]: {
    preview: TargetedPublication,
    detail: TargetedPublication,
  },
  [NDKKind.BadgeDefinition]: {
    preview: Badge,
    detail: Badge,
  },
  [NDKKind.RelayList]: {
    preview: RelayList,
    detail: RelayList,
  },
  [NDKKind.RelaySet]: {
    preview: RelayList,
    detail: RelayList,
  },
  [MODERATED_COMMUNITY]: {
    preview: ModeratedCommunitiesPreview,
    detail: ModeratedCommunitiesPreview,
    content: ModeratedCommunitiesContent,
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

// Add a hook to handle reply functionality
function useReply(event: NostrEvent, group?: Group) {
  const ndk = useNDK();
  const userRelays = useRelays();
  const relaySet = useRelaySet(group ? [group.relay] : userRelays);
  const [showReplyDialog, setShowReplyDialog] = useState(false);
  const { t } = useTranslation();

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
          ["P", rootPubkey],
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

  function openReplyDialog() {
    setShowReplyDialog(true);
  }

  return {
    showReplyDialog,
    setShowReplyDialog,
    onReply,
    openReplyDialog,
  };
}

// Add a hook to handle emoji reactions
function useEmoji(event: NostrEvent, group?: Group) {
  const ndk = useNDK();
  const userRelays = useRelays();
  const relaySet = useRelaySet(group ? [group.relay] : userRelays);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const { t } = useTranslation();

  function openEmojiPicker() {
    setShowEmojiPicker(true);
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

  return {
    showEmojiPicker,
    setShowEmojiPicker,
    onEmojiSelect,
    openEmojiPicker,
  };
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
  const navigate = useNavigate();
  const groups = useSortedGroups();
  const isGroupEvent =
    group &&
    group.id !== "_" &&
    event.tags.find((t) => t[0] === "h")?.[1] === group.id;
  const { t } = useTranslation();
  const [showZapDialog, setShowZapDialog] = useState(false);
  const { data: mintList } = useMintList(event.pubkey);
  const { showReplyDialog, setShowReplyDialog, onReply, openReplyDialog } =
    useReply(event, group);
  const {
    showEmojiPicker,
    setShowEmojiPicker,
    onEmojiSelect,
    openEmojiPicker,
  } = useEmoji(event, group);

  function showDetail() {
    const url = eventLink(event, group);
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
      {showReplyDialog ? (
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
      {showEmojiPicker ? (
        <EmojiPicker
          open={showEmojiPicker}
          onOpenChange={setShowEmojiPicker}
          onEmojiSelect={onEmojiSelect}
        />
      ) : null}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="smallIcon">
            <Ellipsis />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          <DropdownMenuGroup>
            {canOpen ? (
              <>
                <DropdownMenuItem onClick={showDetail}>
                  <Maximize />
                  <span>{t("action-open")}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            ) : null}
            <DropdownMenuItem onClick={openReplyDialog}>
              <Reply />
              <span>{t("chat.message.reply.action")}</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowZapDialog(true)}>
              <Bitcoin />
              <span>{t("action-zap")}</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={openEmojiPicker}>
              <SmilePlus />
              <span>{t("chat.message.react.action")}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
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
  relays = [],
  className,
  onClick,
  asLink = false,
}: {
  event: NostrEvent;
  group?: Group;
  relays?: string[];
  className?: string;
  onClick?: (ev: NostrEvent) => void;
  asLink?: boolean;
}) {
  const url = asLink ? eventLink(event, group) : undefined;
  const component = eventDetails[event.kind]?.reply;
  const content = component ? (
    <div
      className={cn(
        "p-1 pl-2 border-l-4 rounded-md mb-1 bg-background/80 border-background dark:bg-background/40 dark:border-background/60",
        onClick || asLink ? "cursor-pointer" : "",
        className,
      )}
      onClick={onClick ? () => onClick(event) : undefined}
    >
      {component({ event, group, relays })}
    </div>
  ) : (
    <div
      className={cn(
        "h-12 p-1 pl-2 border-l-4 rounded-md mb-1 bg-background/80 border-background dark:bg-background/40 dark:border-background/60",
        onClick || asLink ? "cursor-pointer" : "",
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
  return asLink && url ? <Link to={url}>{content}</Link> : content;
}

export function ReplyEmbed({
  event,
  root,
  group,
  className,
  classNames,
  canOpenDetails = false,
  showReactions = true,
  options = {},
  relays = [],
  inline = false,
}: {
  event: NostrEvent;
  root: NostrEvent;
  group?: Group;
  className?: string;
  canOpenDetails?: boolean;
  showReactions?: boolean;
  options?: RichTextOptions;
  classNames?: RichTextClassnames;
  relays: string[];
  inline?: boolean;
}) {
  const ndk = useNDK();
  const userRelays = useRelays();
  const canSign = useCanSign();
  const [showThread, setShowThread] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showZapDialog, setShowZapDialog] = useState(false);
  const [zapType, setZapType] = useState<"nip-57" | "nip-61">("nip-61");
  const components = eventDetails[event.kind];
  const [isDeleted, setIsDeleted] = useState(false);
  const relaySet = useRelaySet(group ? [group.relay] : userRelays);
  // Use the shared hook for reply functionality
  const { showReplyDialog, setShowReplyDialog, onReply, openReplyDialog } =
    useReply(event, group);
  // NIP-31
  const { t } = useTranslation();
  const isRelayGroup = group?.id === "_";
  const { data: mintList } = useMintList(event.pubkey);
  const { events: comments } = useReplies(event, group);
  const hasReplies = comments.length > 0;

  const repliers = comments
    .map((c) => {
      if (c.kind === NDKKind.Zap) {
        return c.tags.find((t) => t[0] === "P")?.[1];
      }
      return c.pubkey;
    })
    .filter(Boolean) as string[];

  function openEmojiPicker() {
    setShowEmojiPicker(true);
  }

  function openThread() {
    setShowThread(true);
  }

  function openZapDialog(type: "nip-61" | "nip-57") {
    setZapType(type);
    setShowZapDialog(true);
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
    <div
      className={cn(
        "py-1 px-4 pb-2 space-y-3",
        components?.reply ? "" : components?.className,
      )}
    >
      {components?.reply ? (
        components.reply({
          event,
          relays,
          group,
          options,
          classNames,
        })
      ) : components?.preview ? (
        components.preview({
          event,
          relays,
          group,
          options,
          classNames,
        })
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
      {repliers.length > 0 && (
        <div className="my-0.5 flex items-center gap-1.5">
          <NameList
            pubkeys={repliers}
            suffix={t("event.replied")}
            avatarClassName="size-4"
            textClassName="text-sm"
          />
        </div>
      )}
      {showReactions ? (
        <Reactions
          event={event}
          relays={group ? [group.relay] : [...relays, ...userRelays]}
          kinds={[NDKKind.Reaction, NDKKind.Zap, NDKKind.Nutzap]}
        />
      ) : null}
    </div>
  );

  if (inline && components?.preview) {
    return components.preview({ event, relays, group, options, classNames });
  }

  // todo: emojis show before dragging
  return (
    <>
      <div className="relative rounded-sm bg-accent">
        <motion.div
          className={cn(
            "z-10 border relative bg-background text-foreground rounded-sm font-sans",
            components?.reply ? "" : components?.className,
            hasReplies ? "hover:bg-accent cursor-zoom-in" : "",
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
          onClick={() => {
            if (hasReplies) {
              openThread();
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
      {showThread && (
        <Thread
          root={root}
          replies={[event, ...comments]}
          open={showThread}
          onOpenChange={setShowThread}
          group={group}
        />
      )}
    </>
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
  inline = false,
}: {
  event: NostrEvent;
  group?: Group;
  className?: string;
  canOpenDetails?: boolean;
  showReactions?: boolean;
  options?: RichTextOptions;
  classNames?: RichTextClassnames;
  relays: string[];
  inline?: boolean;
}) {
  const ndk = useNDK();
  const userRelays = useRelays();
  const canSign = useCanSign();
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [zapType, setZapType] = useState<"nip-57" | "nip-61">("nip-61");
  const [showZapDialog, setShowZapDialog] = useState(false);
  const components = eventDetails[event.kind];
  const [isDeleted, setIsDeleted] = useState(false);
  // Use the shared hook for reply functionality
  const { showReplyDialog, setShowReplyDialog, onReply, openReplyDialog } =
    useReply(event, group);
  // NIP-31
  const alt = event.tags.find((t) => t[0] === "alt")?.[1];
  const { t } = useTranslation();
  const isRelayGroup = group?.id === "_";
  const { data: mintList } = useMintList(event.pubkey);
  const relaySet = useRelaySet(group ? [group.relay] : userRelays);

  function openEmojiPicker() {
    setShowEmojiPicker(true);
  }

  function openZapDialog(type: "nip-61" | "nip-57") {
    setZapType(type);
    setShowZapDialog(true);
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

  if (inline && components?.preview) {
    return components.preview({ event, relays, group, options, classNames });
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
  replies,
  className,
  classNames,
  isDetail = false,
  canOpenDetails = true,
  showReactions = true,
  options = {},
  relays = [],
  asLink = false,
  asReply = false,
  onClick,
  inline = false,
}: {
  event: NostrEvent;
  group?: Group;
  replies?: NostrEvent[];
  className?: string;
  canOpenDetails?: boolean;
  isDetail?: boolean;
  showReactions?: boolean;
  options?: RichTextOptions;
  classNames?: RichTextClassnames;
  relays: string[];
  asReply?: boolean;
  asLink?: boolean;
  onClick?: (ev: NostrEvent) => void;
  inline?: boolean;
}) {
  // todo: if is detail, swipe to reply/react
  const { t } = useTranslation();
  const userRelays = useRelays();
  const components = eventDetails[event.kind];
  // NIP-31
  const alt = event.tags.find((t) => t[0] === "alt")?.[1];
  const repliers = replies
    ?.map((r) => {
      if (r.kind === NDKKind.Zap) {
        return r.tags.find((t) => t[0] === "P")?.[1];
      }
      return r.pubkey;
    })
    .filter(Boolean) as string[];
  if (asReply) {
    return (
      <AsReply
        asLink={asLink}
        event={event}
        group={group}
        className={className}
        onClick={onClick}
      />
    );
  }

  if (inline && components?.preview) {
    return components.preview({ event, relays, group, options, classNames });
  }

  return (
    <div
      className={cn(
        "border bg-background text-foreground rounded-sm font-sans w-full",
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
        {repliers?.length > 0 && (
          <div className="my-0.5">
            <NameList
              pubkeys={repliers}
              suffix={t("event.replied")}
              avatarClassName="size-4"
              textClassName="text-sm"
            />
          </div>
        )}
        {showReactions && !isDetail ? (
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
  const { eose, events } = useDirectReplies(event, group);
  // The sorting is now handled in useDirectReplies by the sortComments function
  const comments = events;
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
md:w-[calc(100vw-18rem)]
	  group-has-[[data-collapsible=icon]]/sidebar-wrapper:w-[calc(100vw-4rem)]"
    >
      <div className="w-full max-w-xl">
        <Embed
          isDetail
          event={event}
          group={group}
          replies={comments}
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
                <ReplyEmbed
                  canOpenDetails
                  key={comment.id}
                  event={comment}
                  root={event}
                  group={group}
                  className="rounded-none border-b border-l-none border-t-none border-r-none"
                  relays={relays}
                />
              ))}
            </AnimatePresence>
          </TabsContent>
          <TabsContent value="details">
            <div className="flex flex-col gap-3 py-3 px-4">
              <LazyCodeBlock
                code={JSON.stringify(event, null, 2)}
                language="json"
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

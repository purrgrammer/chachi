import { useState } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Maximize,
  Reply,
  SmilePlus,
  Trash,
  Ellipsis,
  MessageSquareShare,
  Ban,
} from "lucide-react";
import { NDKRelaySet } from "@nostr-dev-kit/ndk";
import { NostrEvent } from "nostr-tools";
import { Empty } from "@/components/empty";
import { Loading } from "@/components/loading";
import { useNavigate } from "react-router-dom";
import { NDKEvent, NDKKind } from "@nostr-dev-kit/ndk";
import {
  RichText,
  RichTextOptions,
  RichTextClassnames,
} from "@/components/rich-text";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/nostr/header";
import { Reactions } from "@/components/nostr/reactions";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/nav-tabs";
import { Post, PostWithReplies } from "@/components/nostr/post";
import { HorizontalVideo, VerticalVideo } from "@/components/nostr/video";
import { AutocompleteTextarea } from "@/components/autocomplete-textarea";
import { ArticleSummary, Article } from "@/components/nostr/article";
import {
  GroupMetadata,
  GroupName,
  GroupPicture,
} from "@/components/nostr/groups/metadata";
import { Repo, Issues } from "@/components/nostr/repo";
import { Highlight } from "@/components/nostr/highlight";
import { Stream } from "@/components/nostr/stream";
import People from "@/components/nostr/people";
import { EmojiSet } from "@/components/nostr/emoji-set";
import { Emoji } from "@/components/emoji";
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
import { getRelayHost } from "@/lib/relay";
import { useNDK } from "@/lib/ndk";
import { useRelaySet, useRelays } from "@/lib/nostr";
import { useReplies } from "@/lib/nostr/comments";
import { useGroupAdminsList, useGroupName } from "@/lib/nostr/groups";
import { useMyGroups, useOpenGroup } from "@/lib/groups";
import {
  POLL,
  REPO,
  ISSUE,
  COMMENT,
  STREAM,
  CALENDAR_EVENT,
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
import { saveGroupEvent } from "@/lib/messages";
import { usePubkey, useCanSign } from "@/lib/account";
import type { Group, Emoji as EmojiType } from "@/lib/types";
import { useTranslation } from "react-i18next";

type EventComponent = (props: {
  event: NostrEvent;
  group: Group;
  relays: string[];
  options?: RichTextOptions;
  classNames?: RichTextClassnames;
}) => JSX.Element;

// todo: events with no header or alternative author (group metadata, zap?, stream)
const eventDetails: Record<
  number,
  {
    noHeader?: boolean;
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
  //[9735]: {
  //  preview: Zap,
  //  detail: Zap,
  //},
  //[30040]: {
  //  preview: Book,
  //  detail: Book,
  //},
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
  const groupName = useGroupName(group);
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
    } finally {
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t("share.publication")}</DialogTitle>
          {groupName ? (
            <DialogDescription>
              {t("share.this.in", { groupName })}
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
            <MessageSquareShare />
            {t("share-in")}
            <GroupPicture group={group} className="size-4" /> {groupName}
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
  group: Group;
  relays: string[];
  canOpen?: boolean;
}) {
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [shareGroup, setShareGroup] = useState<Group>(group);
  const ndk = useNDK();
  const navigate = useNavigate();
  const groups = useMyGroups();
  const groupName = useGroupName(group);
  const isGroupEvent =
    group.id !== "_" && event.tags.find((t) => t[0] === "h")?.[1] === group.id;
  const { t } = useTranslation();

  function showDetail() {
    const ev = new NDKEvent(ndk, event);
    // @ts-expect-error for some reason it thinks this function takes a number
    const nlink = ev.encode(relays);
    let url = "";
    if (group.id === "_") {
      url = `/${getRelayHost(group.relay)}/e/${nlink}`;
    } else {
      url = `/${getRelayHost(group.relay)}/${group.id}/e/${nlink}`;
    }
    navigate(url);
  }

  function shareIn(group: Group) {
    setShareGroup(group);
    setShowShareDialog(true);
  }

  return (
    <>
      <ShareDialog
        open={showShareDialog}
        onOpenChange={setShowShareDialog}
        event={event}
        group={shareGroup}
        relays={relays}
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="smallIcon">
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
            {isGroupEvent ? (
              <DropdownMenuItem onClick={() => shareIn(group)}>
                <MessageSquareShare />
                {groupName ? (
                  <span className="line-clamp-1">
                    {" "}
                    {t("share.in.x", { groupName })}
                  </span>
                ) : (
                  <span className="line-clamp-1">{t("share.in.chat")}</span>
                )}
              </DropdownMenuItem>
            ) : (
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="gap-2">
                  <MessageSquareShare className="size-4" />
                  <span>Share in</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent>
                    {groups.map((g) => (
                      <DropdownMenuItem key={g.id} onClick={() => shareIn(g)}>
                        <GroupPicture group={g} className="size-4" />
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
  group: Group;
  className?: string;
  canOpenDetails?: boolean;
  showReactions?: boolean;
  options?: RichTextOptions;
  classNames?: RichTextClassnames;
  relays: string[];
}) {
  const ndk = useNDK();
  const userRelays = useRelays();
  const me = usePubkey();
  const canSign = useCanSign();
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showReplyDialog, setShowReplyDialog] = useState(false);
  const relaySet = useRelaySet([group.relay]);
  const components = eventDetails[event.kind];
  const { data: admins } = useGroupAdminsList(group);
  const canDelete = me && (me === event.pubkey || admins?.includes(me));
  const [isDeleted, setIsDeleted] = useState(false);
  // NIP-31
  const alt = event.tags.find((t) => t[0] === "alt")?.[1];
  const { t } = useTranslation();

  function openEmojiPicker() {
    setShowEmojiPicker(true);
  }

  function openReplyDialog() {
    setShowReplyDialog(true);
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
      const rootRelay = root ? root[2] : group.relay;
      const rootPubkey = root ? root[3] : event.pubkey;
      const ev = new NDKEvent(ndk, {
        kind: COMMENT,
        content,
        tags: [
          ["h", group.id, group.relay],
          ...(group.id === "_" ? [["-"]] : []),
          // root marker
          rootTag === "E"
            ? [rootTag, rootRef, rootRelay, rootPubkey]
            : [rootTag, rootRef, rootRelay],
          ["K", rootKind],
          // parent item
          t === "e"
            ? [t, ref, group.relay, event.pubkey]
            : [t, ref, group.relay],
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
      if (e.native) {
        // TODO add translation
        // toast.success(`Reacted with ${e.native}`);
        toast.success(t("chat.message.react.success", { emoji: e.native }));
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
      setShowEmojiPicker(false);
    }
  }

  async function onDelete() {
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
      setIsDeleted(true);
    } catch (err) {
      console.error(err);
      toast.error(t("post.delete.error"));
    }
  }

  const header = (
    <div className="flex gap-3 items-center py-2 px-3 space-between">
      {components?.noHeader ? null : (
        <>
          <Header event={event} />
          <EventMenu
            event={event}
            group={group}
            relays={relays}
            canOpen={canOpenDetails}
          />
        </>
      )}
    </div>
  );

  const body = (
    <div className="py-1 px-4 pb-2 space-y-3">
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
          relays={[group.relay, ...relays, ...userRelays]}
          kinds={[NDKKind.Zap, NDKKind.Reaction]}
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
              {canDelete ? (
                <ContextMenuItem className="cursor-pointer" onClick={onDelete}>
                  {t("chat.message.delete.action")}
                  <ContextMenuShortcut>
                    <Trash className="w-4 h-4 text-destructive" />
                  </ContextMenuShortcut>
                </ContextMenuItem>
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
      {showEmojiPicker && canSign ? (
        <EmojiPicker
          open={showEmojiPicker}
          onOpenChange={setShowEmojiPicker}
          onEmojiSelect={onEmojiSelect}
        >
          <Embed
            canOpenDetails={false}
            showReactions={false}
            event={event}
            group={group}
            relays={relays}
            className="overflow-y-auto overflow-x-hidden max-h-32 rounded-b-none border-none pretty-scrollbar"
          />
        </EmojiPicker>
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
  canOpenDetails = true,
  showReactions = true,
  options = {},
  relays = [],
}: {
  event: NostrEvent;
  group: Group;
  className?: string;
  canOpenDetails?: boolean;
  showReactions?: boolean;
  options?: RichTextOptions;
  classNames?: RichTextClassnames;
  relays: string[];
}) {
  const userRelays = useRelays();
  const components = eventDetails[event.kind];
  // NIP-31
  const alt = event.tags.find((t) => t[0] === "alt")?.[1];
  return (
    <div
      className={cn(
        "border bg-background text-foreground rounded-sm font-sans",
        className,
      )}
    >
      <div className="flex gap-3 items-center py-2 px-3 space-between">
        {components?.noHeader ? null : (
          <>
            <Header event={event} />
            <EventMenu
              event={event}
              group={group}
              relays={relays}
              canOpen={canOpenDetails}
            />
          </>
        )}
      </div>
      <div className="py-1 px-4 pb-2 space-y-3">
        {components?.preview ? (
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
            relays={[group.relay, ...relays, ...userRelays]}
            kinds={[NDKKind.Zap, NDKKind.Reaction]}
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
  group: Group;
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
        <FeedEmbed
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

import { useState } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Maximize, Reply, SmilePlus } from "lucide-react";
import { NostrEvent } from "nostr-tools";
import { Empty } from "@/components/empty";
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
import { ArticleSummary, Article } from "@/components/nostr/article";
import { GroupMetadata } from "@/components/nostr/groups/metadata";
import { Highlight } from "@/components/nostr/highlight";
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
import { ReplyDialog } from "@/components/nostr/reply";
import { getRelayHost } from "@/lib/relay";
import { useNDK } from "@/lib/ndk";
import { useRelaySet, useRelays } from "@/lib/nostr";
import { useReplies } from "@/lib/nostr/comments";
import type { Group } from "@/lib/types";
import { POLL } from "@/lib/kinds";
import { cn } from "@/lib/utils";

// preview: basic embed
// detail: embed on detail view
// content: extra content for detailed view

type EventComponent = (props: {
  event: NostrEvent;
  group: Group;
  options?: RichTextOptions;
  classNames?: RichTextClassnames;
}) => JSX.Element;

// todo: events with no header (group metadata, zap?)
const eventDetails: Record<
  number,
  {
    preview: EventComponent;
    detail: EventComponent;
    content?: EventComponent;
  }
> = {
  [NDKKind.Text]: {
    preview: PostWithReplies,
    detail: Post,
  },
  [1111]: {
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
  //[NDKKind.GroupChat]: {
  //},
  [NDKKind.GroupMetadata]: {
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
  //[9735]: {
  //  preview: Zap,
  //  detail: Zap,
  //},
  //[30040]: {
  //  preview: Book,
  //  detail: Book,
  //},
};

export function FeedEmbed({
  event,
  group,
  className,
  classNames,
  canOpenDetails = false,
  showReactions = true,
  options = {},
}: {
  event: NostrEvent;
  group: Group;
  className?: string;
  canOpenDetails?: boolean;
  showReactions?: boolean;
  options?: RichTextOptions;
  classNames?: RichTextClassnames;
}) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showReplyDialog, setShowReplyDialog] = useState(false);
  const relaySet = useRelaySet([group.relay]);
  const ndk = useNDK();
  const userRelays = useRelays();
  const navigate = useNavigate();
  const components = eventDetails[event.kind];
  // NIP-31
  const alt = event.tags.find((t) => t[0] === "alt")?.[1];

  function showDetail() {
    const ev = new NDKEvent(ndk, event);
    const relays = Array.from(new Set([group.relay, ...userRelays]));
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
        (t) => t[0] === "E" || t[0] === "A" || t[0] === "i",
      );
      const rootTag = root?.[0] ?? t.toUpperCase();
      const rootKind =
        event.tags.find((t) => t[0] === "K")?.[1] ?? String(event.kind);
      const rootRef = root ? root[1] : ref;
      const rootRelay = root ? root[2] : group.relay;
      const rootPubkey = root ? root[3] : event.pubkey;
      const ev = new NDKEvent(ndk, {
        kind: 1111 as NDKKind,
        content,
        tags: [
          ["h", group.id, group.relay],
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
      toast.error("Couldn't reply");
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
        toast.success(`Reacted with ${e.native}`);
      } else if (e.src) {
        // nit: info icon
        toast(
          <div className="flex flex-row gap-2 items-center">
            Reacted with{" "}
            <Emoji
              name={e.name}
              image={e.src}
              className="w-5 h-5 inline-block"
            />
          </div>,
        );
      }
    } catch (err) {
      console.error(err);
      toast.error("Couldn't react");
    } finally {
      setShowEmojiPicker(false);
    }
  }

  // todo: emojis show before dragging
  return (
    <div className="bg-accent rounded-sm relative">
      <motion.div
        className={cn(
          "z-10 border relative bg-background text-foreground rounded-sm font-sans",
          className,
        )}
        // Drag controls
        drag="x"
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
        <ContextMenu>
          <ContextMenuTrigger>
            <div className="flex space-between items-center px-3 py-2 gap-3">
              <Header event={event} />
              {canOpenDetails ? (
                <Button variant="ghost" size="smallIcon" onClick={showDetail}>
                  <Maximize />
                </Button>
              ) : null}
            </div>
            <div className="px-4 py-1 pb-2 space-y-3">
              {components?.preview ? (
                components.preview({ event, group, options, classNames })
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
                  relays={[group.relay, ...userRelays]}
                  kinds={[NDKKind.Zap, NDKKind.Reaction]}
                />
              ) : null}
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem
              className="cursor-pointer"
              onClick={openReplyDialog}
            >
              Reply
              <ContextMenuShortcut>
                <Reply className="w-4 h-4" />
              </ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuItem
              className="cursor-pointer"
              onClick={openEmojiPicker}
            >
              React
              <ContextMenuShortcut>
                <SmilePlus className="w-4 h-4" />
              </ContextMenuShortcut>
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      </motion.div>
      <Reply className="z-0 size-6 absolute top-3 left-2" />
      <SmilePlus className="z-0 size-6 absolute top-3 right-2" />
      {showEmojiPicker ? (
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
            className="border-none rounded-b-none max-h-32 overflow-y-auto overflow-x-hidden pretty-scrollbar"
          />
        </EmojiPicker>
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
            className="border-none rounded-b-none max-h-32 overflow-y-auto overflow-x-hidden pretty-scrollbar"
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
}: {
  event: NostrEvent;
  group: Group;
  className?: string;
  canOpenDetails?: boolean;
  showReactions?: boolean;
  options?: RichTextOptions;
  classNames?: RichTextClassnames;
}) {
  const ndk = useNDK();
  const userRelays = useRelays();
  const navigate = useNavigate();
  const components = eventDetails[event.kind];
  // NIP-31
  const alt = event.tags.find((t) => t[0] === "alt")?.[1];

  function showDetail() {
    const ev = new NDKEvent(ndk, event);
    const relays = Array.from(new Set([group.relay, ...userRelays]));
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

  return (
    <div
      className={cn(
        "border bg-background text-foreground rounded-sm font-sans",
        className,
      )}
    >
      <div className="flex space-between items-center px-3 py-2 gap-3">
        <Header event={event} />
        {canOpenDetails ? (
          <Button variant="ghost" size="smallIcon" onClick={showDetail}>
            <Maximize />
          </Button>
        ) : null}
      </div>
      <div className="px-4 py-1 pb-2 space-y-3">
        {components?.preview ? (
          components.preview({ event, group, options, classNames })
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
            relays={[group.relay, ...userRelays]}
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
  relays?: string[];
}) {
  // todo: 1111 comments, reposts, bookmarks, etc
  console.log("RELAYS", relays);
  const { events: comments } = useReplies(event, group);
  const hasContent = eventDetails[event.kind]?.content;

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
        />
        <Tabs defaultValue={hasContent ? "content" : "replies"}>
          <TabsList className="border-t px-4">
            {hasContent ? (
              <TabsTrigger value="content">Content</TabsTrigger>
            ) : null}
            <TabsTrigger value="replies">Replies</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
          </TabsList>
          {hasContent ? (
            <TabsContent value="content">
              <div className="px-4 py-2">
                {eventDetails[event.kind]?.content?.({
                  event,
                  group,
                })}
              </div>
            </TabsContent>
          ) : null}
          <TabsContent value="replies">
            <AnimatePresence initial={false}>
              {comments.length === 0 ? <Empty className="my-16" /> : null}
              {comments.map((comment) => (
                // todo: subthreads as chat on click
                <FeedEmbed
                  canOpenDetails
                  key={comment.id}
                  event={comment}
                  group={group}
                  className="rounded-none border-l-none border-t-none border-r-none border-b"
                />
              ))}
            </AnimatePresence>
          </TabsContent>
          <TabsContent value="details">
            <div className="px-2 py-3">
              <pre className="text-xs whitespace-pre-wrap break-words border rounded-sm p-2">
                {JSON.stringify(event, null, 2)}
              </pre>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

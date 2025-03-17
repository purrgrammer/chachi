import { useState } from "react";
import { NostrEvent } from "nostr-tools";
import { NDKKind } from "@nostr-dev-kit/ndk";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Chat } from "@/components/nostr/chat/chat";
import { ChatInput } from "@/components/nostr/chat/input";
import { ChatZap } from "@/components/nostr/chat/zap";
import { ChatNutzap } from "@/components/nostr/chat/nutzap";
import { useGroupAdminsList } from "@/lib/nostr/groups";
import { usePubkey } from "@/lib/account";
import type { Group } from "@/lib/types";
import { Embed } from "@/components/nostr/detail";

interface ThreadComponentProps {
  event: NostrEvent;
  admins: string[];
  scrollTo?: NostrEvent;
  setScrollTo?: (ev?: NostrEvent) => void;
  setReplyingTo?: (event: NostrEvent) => void;
  deleteEvent?: (event: NostrEvent) => void;
  canDelete?: (event: NostrEvent) => boolean;
}

export function Thread({
  root,
  replies,
  open = true,
  onOpenChange,
  group,
}: {
  root: NostrEvent;
  replies: NostrEvent[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  group?: Group;
}) {
  console.log("THREAD", root, group);
  const [replyingTo, setReplyingTo] = useState<NostrEvent | undefined>();
  const isFromGroup = root.tags.find((t) => t[0] === "h" && t[1] === group?.id);
  const [scrollTo, setScrollTo] = useState<NostrEvent | undefined>();
  const [newMessage, setNewMessage] = useState<NostrEvent | undefined>();
  const [inputHeight, setInputHeight] = useState(34);
  const { data: admins = [] } = useGroupAdminsList(group);
  const me = usePubkey();

  const canDelete = (event: NostrEvent) => {
    return me === event.pubkey || admins.includes(me || "");
  };

  const deleteEvent = (event: NostrEvent) => {
    console.log("Delete event:", event);
  };

  const handleNewMessage = (event: NostrEvent) => {
    setNewMessage(event);
  };

  const components: Record<
    number,
    React.ComponentType<ThreadComponentProps>
  > = {
    [root.kind]: (props: ThreadComponentProps) => (
      <Embed
        className="w-full w-[92vw] mx-auto mb-2"
        key={props.event.id}
        {...props}
        group={isFromGroup ? group : undefined}
        relays={isFromGroup && group ? [group?.relay] : []}
      />
    ),
    [NDKKind.Zap]: (props: ThreadComponentProps) => (
      <ChatZap
        key={props.event.id}
        {...props}
        group={isFromGroup ? group : undefined}
      />
    ),
    [NDKKind.Nutzap]: (props: ThreadComponentProps) => (
      <ChatNutzap
        key={props.event.id}
        {...props}
        group={isFromGroup ? group : undefined}
      />
    ),
  };

  // todo: @ autocomplete thread participants
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="flex flex-col h-[100vh]">
        <div className="flex flex-col h-full overflow-hidden">
          <div className="flex-grow overflow-hidden relative">
            <Chat
              events={[...replies, root]}
              group={isFromGroup ? group : undefined}
              admins={admins}
              messageKinds={[
                NDKKind.GroupChat,
                NDKKind.Text,
                NDKKind.GenericReply,
              ]}
              canDelete={canDelete}
              deleteEvent={deleteEvent}
              setReplyingTo={setReplyingTo}
              scrollTo={scrollTo}
              style={
                {
                  paddingTop: "1rem",
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  overflow: "auto",
                  WebkitOverflowScrolling: "touch", // For iOS smooth scrolling
                } as React.CSSProperties
              }
              setScrollTo={setScrollTo}
              newMessage={newMessage}
              deleteEvents={[]}
              showTimestamps={false}
              components={components}
              className="h-full"
            />
          </div>

          <ChatInput
            kind={1111 as NDKKind}
            replyKind={1111 as NDKKind}
            group={isFromGroup ? group : undefined}
            rootEvent={root}
            disabled={!replyingTo}
            placeholder="Reply to a message"
            replyingTo={replyingTo}
            setReplyingTo={setReplyingTo}
            onNewMessage={handleNewMessage}
            height={inputHeight}
            onHeightChange={setInputHeight}
            pubkeys={replies.map((r) => r.pubkey)}
            tags={isFromGroup && group ? [["h", group.id, group.relay]] : []}
          />
        </div>
      </DrawerContent>
    </Drawer>
  );
}

import { useState } from "react";
import { NostrEvent } from "nostr-tools";
import { NDKKind } from "@nostr-dev-kit/ndk";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Chat } from "@/components/nostr/chat/chat";
import { ChatInput } from "@/components/nostr/chat/input";
import { ChatZap } from "@/components/nostr/chat/zap";
import { useGroupAdminsList } from "@/lib/nostr/groups";
import { usePubkey } from "@/lib/account";
import type { Group } from "@/lib/types";
import { Embed } from "@/components/nostr/detail";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
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
    // todo: implement deletion
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
  };

  // todo: @ autocomplete thread participants
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex flex-col h-[100dvh] max-w-full w-full p-0 m-0 border-0 rounded-none"
        hideClose
      >
        <div className="flex flex-col h-full overflow-hidden relative">
          <div className="sticky top-0 z-10 bg-background p-4 border-b flex items-center justify-between">
            <h2 className="text-lg font-medium">{t("event.thread")}</h2>
            <button
              onClick={() => onOpenChange?.(false)}
              className="p-1 rounded-full hover:bg-muted"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-grow overflow-y-auto">
            <Chat
              events={[...replies.reverse(), root]}
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
              setScrollTo={setScrollTo}
              newMessage={newMessage}
              showTimestamps={false}
              components={components}
              className="h-full pb-4 px-2"
            />
          </div>

          <div className="sticky bottom-0 z-10 bg-background border-t">
            <ChatInput
              kind={
                root.kind === NDKKind.Text ? NDKKind.Text : NDKKind.GenericReply
              }
              replyKind={
                root.kind === NDKKind.Text ? NDKKind.Text : NDKKind.GenericReply
              }
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
        </div>
      </DialogContent>
    </Dialog>
  );
}

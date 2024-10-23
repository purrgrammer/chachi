import { useState } from "react";
import { NostrEvent } from "nostr-tools";
import { NDKKind } from "@nostr-dev-kit/ndk";
import { Button } from "@/components/ui/button";
import { Embed } from "@/components/nostr/detail";
import { Chat } from "@/components/nostr/chat/chat";
import { ChatInput } from "@/components/nostr/chat/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useGroupParticipants } from "@/lib/nostr/groups";
import type { Group } from "@/lib/types";

function ThreadBody({
  group,
  event,
  events,
}: {
  group: Group;
  event: NostrEvent;
  events: NostrEvent[];
}) {
  const { admins } = useGroupParticipants(group);
  const [replyingTo, setReplyingTo] = useState<NostrEvent | null>(event);
  const [newMessage, setNewMessage] = useState<NostrEvent | undefined>(
    undefined,
  );
  const previousMessageIds = events.slice(-3).map((e) => e.id.slice(0, 8));

  function onNewMessage(ev: NostrEvent) {
    setNewMessage(ev);
    setReplyingTo(event);
  }

  return (
    <>
      <Embed event={event} group={group} />
      <Chat
        className="h-[210px]"
        admins={admins}
        group={group}
        events={events}
        showRootReply={false}
        messageKinds={[NDKKind.GroupNote, NDKKind.GroupReply]}
        newMessage={newMessage}
        setReplyingTo={setReplyingTo}
      />
      <ChatInput
        group={group}
        height={50}
        kind={NDKKind.GroupReply}
        replyKind={NDKKind.GroupReply}
        onNewMessage={onNewMessage}
        showReplyPreview={replyingTo?.id !== event.id}
        replyingTo={replyingTo}
        setReplyingTo={setReplyingTo}
        tags={
          previousMessageIds.length > 0
            ? [
                ["h", group.id, group.relay],
                ["previous", ...previousMessageIds],
              ]
            : [["h", group.id, group.relay]]
        }
      />
    </>
  );
}

export function Thread({
  group,
  event,
  events,
}: {
  group: Group;
  event: NostrEvent;
  events: NostrEvent[];
}) {
  const [showThread, setShowThread] = useState(false);
  return events.length > 0 ? (
    <Dialog open={showThread} onOpenChange={setShowThread}>
      <DialogTrigger asChild>
        <Button
          variant="link"
          className="font-light text-xs text-muted-foreground p-0 h-[1rem]"
        >
          {events.length} replies
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Thread</DialogTitle>
        </DialogHeader>
        <ThreadBody group={group} event={event} events={events} />
      </DialogContent>
    </Dialog>
  ) : null;
}

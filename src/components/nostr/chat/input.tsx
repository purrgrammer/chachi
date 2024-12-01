import { useContext, useState, useEffect } from "react";
import { toast } from "sonner";
import { Send, Check } from "lucide-react";
import { NostrEvent } from "nostr-tools";
import { NDKEvent, NDKKind } from "@nostr-dev-kit/ndk";
import { UploadFile } from "@/components/upload-file";
import { Button } from "@/components/ui/button";
import { useRelaySet } from "@/lib/nostr";
import { NDKContext } from "@/lib/ndk";
import { cn } from "@/lib/utils";
import { usePubkey, useCanSign } from "@/lib/account";
import { AutocompleteTextarea } from "@/components/autocomplete-textarea";
import { useBookmarkGroup } from "@/components/nostr/groups/bookmark";
import { useRequestedToJoin, useJoinRequest } from "@/lib/nostr/groups";
import type { Group, Emoji } from "@/lib/types";

function JoinRequest({ group, pubkey }: { group: Group; pubkey: string }) {
  const canSign = useCanSign();
  const { events } = useRequestedToJoin(group, pubkey);
  const joinRequest = useJoinRequest(group);
  const [requested, setRequested] = useState(false);
  const { isBookmarked, bookmarkGroup } = useBookmarkGroup(group);

  useEffect(() => {
    if (events.length > 0) {
      setRequested(true);
    }
  }, [events]);

  async function sendJoinRequest() {
    try {
      await joinRequest();
      toast.success("Join request sent");
      setRequested(true);
      if (!isBookmarked) {
        await bookmarkGroup();
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to send join request");
    }
  }

  return (
    <div className="flex flex-row items-center justify-center h-full gap-3">
      <span className="text-sm text-muted-foreground">
        You are not a member of this group yet
      </span>
      {requested ? (
        <div className="flex flex-row gap-2">
          <Check className="size-5" />
          <span className="text-sm text-muted-foreground">Request sent</span>
        </div>
      ) : (
        <Button disabled={!canSign} size="sm" onClick={sendJoinRequest}>
          Join
        </Button>
      )}
    </div>
  );
}

export function ChatInput({
  group,
  kind,
  showReplyPreview = true,
  replyKind,
  replyingTo,
  setReplyingTo,
  onNewMessage,
  tags,
  className,
  height,
  onHeightChange,
  disabled,
  showJoinRequest,
  children,
}: {
  group: Group;
  kind: NDKKind;
  showReplyPreview?: boolean;
  replyKind?: NDKKind;
  replyingTo: NostrEvent | null;
  setReplyingTo: (event: NostrEvent | null) => void;
  onNewMessage?: (event: NostrEvent) => void;
  tags?: string[][];
  className?: string;
  height: number;
  onHeightChange?: (height: number) => void;
  disabled?: boolean;
  showJoinRequest?: boolean;
  children?: React.ReactNode;
}) {
  const [isPosting, setIsPosting] = useState(false);
  const ndk = useContext(NDKContext);
  const relaySet = useRelaySet([group.relay]);
  const me = usePubkey();
  const canPoast = useCanSign();
  // message
  const [message, setMessage] = useState("");
  const [customEmojis, setCustomEmojis] = useState<Emoji[]>([]);

  async function sendMessage() {
    setIsPosting(true);
    const content = message.trim();
    if (content) {
      const event = new NDKEvent(ndk, {
        kind: replyingTo && replyKind ? replyKind : kind,
        content,
        tags,
      } as NostrEvent);
      if (replyingTo) {
        const root = replyingTo.tags.find((t) => t[3] === "root")?.[1];
        if (root && root !== replyingTo.id) {
          event.tags.push(["e", root, group.relay, "root"]);
          event.tags.push(["e", replyingTo.id, group.relay, "reply"]);
          event.tags.push(["q", replyingTo.id, group.relay, replyingTo.pubkey]);
        } else {
          event.tags.push(["e", replyingTo.id, group.relay, "root"]);
          event.tags.push(["q", replyingTo.id, group.relay, replyingTo.pubkey]);
        }
        const pubkeys = (
          replyingTo.pubkey !== me ? [replyingTo.pubkey] : []
        ).concat(
          replyingTo.tags
            .filter((t) => t[0] === "p" && t[1] !== replyingTo.pubkey)
            .map((t) => t[1]),
        );
        pubkeys.forEach((p) => event.tags.push(["p", p]));
      }
      if (customEmojis.length > 0) {
        customEmojis.forEach((e) => {
          if (e.image) {
            event.tags.push(["emoji", e.name, e.image]);
          }
        });
      }
      try {
        await event.publish(relaySet);
      } catch (err) {
        console.error(err);
        toast.error("Failed to send message");
      } finally {
        setMessage("");
        setIsPosting(false);
        setReplyingTo(null);
        setCustomEmojis([]);
        onNewMessage?.(event.rawEvent() as NostrEvent);
      }
    }
  }

  return (
    <div
      className={cn(`w-full px-2 py-[8px] transition-height`, className)}
      style={{ height: `${height + 16}px` }}
    >
      {showJoinRequest && me ? (
        <JoinRequest pubkey={me} group={group} />
      ) : (
        <div className="flex flex-row items-center h-full gap-1">
          {children}
          <AutocompleteTextarea
            submitOnEnter
            focusAfterSubmit
            disabled={!canPoast || disabled || !me || isPosting}
            group={group}
            message={message}
            setMessage={setMessage}
            placeholder={canPoast ? "Message" : "Log in to send messages"}
            onCustomEmojisChange={setCustomEmojis}
            onHeightChange={(height: number) => {
              onHeightChange?.(height);
            }}
            onFinish={sendMessage}
            reply={replyingTo && showReplyPreview ? replyingTo : undefined}
            setReplyingTo={setReplyingTo}
          />
          <UploadFile
            tabIndex={1}
            onUpload={(url) => setMessage(message ? `${message} ${url}` : url)}
          />
          <Button
            tabIndex={1}
            aria-label="Send"
            disabled={!canPoast}
            size="icon"
            className="sm:hidden"
            onClick={sendMessage}
          >
            <Send className="size-6" />
          </Button>
        </div>
      )}
    </div>
  );
}

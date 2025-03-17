import { useContext, useState, useEffect } from "react";
import { toast } from "sonner";
import { Send, Check, RefreshCw } from "lucide-react";
import { NostrEvent } from "nostr-tools";
import { NDKEvent, NDKKind, NDKRelaySet } from "@nostr-dev-kit/ndk";
import { UploadFile } from "@/components/upload-file";
import { GIFPicker } from "@/components/gif-picker";
import { Button } from "@/components/ui/button";
import { fetchRelayList } from "@/lib/nostr";
import { NDKContext } from "@/lib/ndk";
import { cn } from "@/lib/utils";
import { usePubkey, useCanSign } from "@/lib/account";
import { AutocompleteTextarea } from "@/components/autocomplete-textarea";
import { useBookmarkGroup } from "@/components/nostr/groups/bookmark";
import { useRequestedToJoin, useJoinRequest } from "@/lib/nostr/groups";
import type { Group, Emoji } from "@/lib/types";
import { useTranslation } from "react-i18next";

function JoinRequest({ group, pubkey }: { group: Group; pubkey: string }) {
  const canSign = useCanSign();
  const { events } = useRequestedToJoin(group, pubkey);
  const joinRequest = useJoinRequest(group);
  const [requested, setRequested] = useState(false);
  const { isBookmarked, bookmarkGroup } = useBookmarkGroup(group);
  const { t } = useTranslation();

  useEffect(() => {
    if (events.length > 0) {
      setRequested(true);
    }
  }, [events]);

  async function sendJoinRequest() {
    try {
      await joinRequest();
      toast.success(t("chat.join.request.success"));
      setRequested(true);
      if (!isBookmarked) {
        await bookmarkGroup();
      }
    } catch (err) {
      console.error(err);
      toast.error(t("chat.join.request.error"));
    }
  }

  return (
    <div className="flex flex-row gap-3 justify-center items-center h-full">
      <span className="text-sm text-muted-foreground">
        {t("chat.user.not-member")}
      </span>
      {requested ? (
        <div className="flex flex-row gap-2">
          <Check className="size-5" />
          <span className="text-sm text-muted-foreground">
            {t("chat.join.request.sent")}
          </span>
        </div>
      ) : (
        <Button disabled={!canSign} size="sm" onClick={sendJoinRequest}>
          {t("chat.join.action")}
        </Button>
      )}
    </div>
  );
}

export function ChatInput({
  group,
  kind,
  rootEvent,
  showReplyPreview = true,
  replyKind,
  replyingTo,
  setReplyingTo,
  placeholder,
  onNewMessage,
  tags,
  className,
  pubkeys,
  height,
  onHeightChange,
  disabled,
  showJoinRequest,
  children,
}: {
  group?: Group;
  kind: NDKKind;
  rootEvent?: NostrEvent;
  showReplyPreview?: boolean;
  replyKind?: NDKKind;
  pubkeys?: string[];
  replyingTo?: NostrEvent;
  setReplyingTo: (event: NostrEvent | undefined) => void;
  onNewMessage?: (event: NostrEvent) => void;
  placeholder?: string;
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
  const me = usePubkey();
  const canPoast = useCanSign();
  // message
  const [message, setMessage] = useState("");
  const [customEmojis, setCustomEmojis] = useState<Emoji[]>([]);
  const { t } = useTranslation();

  async function sendMessage(msg: string) {
    setIsPosting(true);
    const relays = group
      ? [group.relay]
      : replyingTo
        ? await fetchRelayList(ndk, replyingTo?.pubkey)
        : [];
    if (relays.length === 0) {
      toast.error(t("send.error"));
      return;
    }
    const relaySet = NDKRelaySet.fromRelayUrls(relays, ndk);
    const content = msg.trim();
    if (!content) {
      return;
    }
    if (content) {
      const event = new NDKEvent(ndk, {
        kind: replyingTo && replyKind ? replyKind : kind,
        content,
        tags,
      } as NostrEvent);
      if (replyingTo) {
        if (replyingTo.kind === NDKKind.Text) {
          const root = replyingTo.tags.find((t) => t[3] === "root")?.[1];
          if (root && root !== replyingTo.id) {
            event.tags.push(["e", root, group?.relay || "", "root"]);
            event.tags.push(["e", replyingTo.id, group?.relay || "", "reply"]);
          } else {
            event.tags.push(["e", replyingTo.id, group?.relay || "", "root"]);
          }
        } else if (replyKind === NDKKind.GenericReply) {
          const replyEv = new NDKEvent(ndk, replyingTo);
          const rootTag = replyingTo.tags.find(
            (t) => t[0] === "E" || t[0] === "A",
          );
          const rootKindTag = replyingTo.tags.find((t) => t[0] === "K");
          const rootPTag = replyingTo.tags.find((t) => t[0] === "P");
          // Root event reference
          if (rootEvent) {
            const ref = replyEv.tagReference();
            ref[0] = ref[0].toUpperCase();
            event.tags.push(ref);
          } else if (rootTag) {
            event.tags.push(rootTag);
          } else {
            const ref = replyEv.tagReference();
            ref[0] = ref[0].toUpperCase();
            event.tags.push(ref);
          }
          // Root event kind
          if (rootEvent) {
            event.tags.push(["K", rootEvent.kind.toString()]);
          } else if (rootKindTag) {
            event.tags.push(rootKindTag);
          } else {
            event.tags.push(["K", String(replyEv.kind)]);
          }
          // Root event pubkey
          if (rootEvent) {
            event.tags.push(["P", rootEvent.pubkey]);
          } else if (rootPTag) {
            event.tags.push(rootPTag);
          } else {
            event.tags.push(["P", String(replyEv.pubkey)]);
          }
          // Reply event reference, kind and pubkey
          event.tags.push(replyEv.tagReference());
          event.tags.push(["k", String(replyEv.kind)]);
          event.tags.push(["p", String(replyEv.pubkey)]);
          // todo: add missing pubkeys from thread
        } else {
          event.tags.push([
            "q",
            replyingTo.id,
            group?.relay || "",
            replyingTo.pubkey,
          ]);
        }
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
        toast.error(t("send.error"));
      } finally {
        setMessage("");
        setIsPosting(false);
        setReplyingTo(undefined);
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
      {showJoinRequest && me && group ? (
        <JoinRequest pubkey={me} group={group} />
      ) : (
        <div className="flex flex-row gap-1 items-center h-full">
          {children}
          <AutocompleteTextarea
            submitOnEnter
            pubkeys={pubkeys}
            focusAfterSubmit
            disabled={!canPoast || disabled || !me || isPosting}
            group={group}
            message={message}
            setMessage={setMessage}
            placeholder={
              placeholder
                ? placeholder
                : canPoast
                  ? t("message")
                  : t("send.login-required")
            }
            onCustomEmojisChange={setCustomEmojis}
            onHeightChange={(height: number) => {
              onHeightChange?.(height);
            }}
            onFinish={() => sendMessage(message)}
            reply={replyingTo && showReplyPreview ? replyingTo : undefined}
            setReplyingTo={setReplyingTo}
          />
          <GIFPicker
            onPick={(gif) => {
              const newMessage = message ? `${message} ${gif.url}` : gif.url;
              sendMessage(newMessage);
            }}
          />
          <UploadFile
            tabIndex={1}
            // todo: add imeta tags
            onUpload={(blob) =>
              setMessage(message ? `${message} ${blob.url}` : blob.url)
            }
          />
          <Button
            tabIndex={1}
            aria-label="Send"
            disabled={!canPoast || isPosting}
            size="wideIcon"
            className="sm:hidden"
            onClick={() => sendMessage(message)}
          >
            {isPosting ? (
              <RefreshCw className="size-4 animate-spin" />
            ) : (
              <Send />
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

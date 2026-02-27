import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Send, Check, RefreshCw } from "lucide-react";
import { NostrEvent } from "nostr-tools";
import { NDKEvent } from "@nostr-dev-kit/ndk";
import * as Kind from "@/lib/nostr/kinds";
import { UploadFile } from "@/components/upload-file";
import { GIFPicker } from "@/components/gif-picker";
import { Button } from "@/components/ui/button";
import { fetchRelayList } from "@/lib/nostr";
import { useNDK } from "@/lib/ndk";
import { cn } from "@/lib/utils";
import { usePubkey, useCanSign } from "@/lib/account";
import { AutocompleteTextarea } from "@/components/autocomplete-textarea";
import { useBookmarkGroup } from "@/components/nostr/groups/bookmark";
import { useRequestedToJoin, useJoinRequest } from "@/lib/nostr/groups";
import type { Group, Emoji } from "@/lib/types";
import { useTranslation } from "react-i18next";
import { useAddUnpublishedEvent } from "@/lib/unpublished";
import { usePublishEvent } from "@/lib/nostr/publishing";

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
        <div className="flex flex-row gap-2 items-center">
          <Check className="size-5" />
          <span className="text-sm text-muted-foreground">
            {t("chat.join.request.sent")}
          </span>
          {canSign ? (
            <Button
              variant="text"
              disabled={!canSign}
              size="sm"
              onClick={sendJoinRequest}
            >
              {t("chat.join.request.resend")}
            </Button>
          ) : null}
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
  kind: number;
  rootEvent?: NostrEvent;
  showReplyPreview?: boolean;
  replyKind?: number;
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
  const { t } = useTranslation();
  const ndk = useNDK();
  const me = usePubkey();
  const canPoast = useCanSign();
  const [isPosting, setIsPosting] = useState(false);
  const [message, setMessage] = useState("");
  const [customEmojis, setCustomEmojis] = useState<Emoji[]>([]);
  const addUnpublishedEvent = useAddUnpublishedEvent();
  const publish = usePublishEvent();

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
    const content = msg.trim();
    if (!content) {
      return;
    }
    if (content) {
      // Build tags array
      const eventTags = [...(tags || [])];

      if (replyingTo) {
        if (replyingTo.kind === Kind.Text) {
          const root = replyingTo.tags.find((t) => t[3] === "root")?.[1];
          if (root && root !== replyingTo.id) {
            eventTags.push(["e", root, group?.relay || "", "root"]);
            eventTags.push(["e", replyingTo.id, group?.relay || "", "reply"]);
          } else {
            eventTags.push(["e", replyingTo.id, group?.relay || "", "root"]);
          }
        } else if (replyKind === Kind.GenericReply) {
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
            eventTags.push(ref);
          } else if (rootTag) {
            eventTags.push(rootTag);
          } else {
            const ref = replyEv.tagReference();
            ref[0] = ref[0].toUpperCase();
            eventTags.push(ref);
          }
          // Root event kind
          if (rootEvent) {
            eventTags.push(["K", rootEvent.kind.toString()]);
          } else if (rootKindTag) {
            eventTags.push(rootKindTag);
          } else {
            eventTags.push(["K", String(replyEv.kind)]);
          }
          // Root event pubkey
          if (rootEvent) {
            eventTags.push(["P", rootEvent.pubkey]);
          } else if (rootPTag) {
            eventTags.push(rootPTag);
          } else {
            eventTags.push(["P", String(replyEv.pubkey)]);
          }
          // Reply event reference, kind and pubkey
          eventTags.push(replyEv.tagReference());
          eventTags.push(["k", String(replyEv.kind)]);
          eventTags.push(["p", String(replyEv.pubkey)]);
          // todo: add missing pubkeys from thread
        } else {
          eventTags.push([
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
            if (e.address) {
              eventTags.push(["emoji", e.name, e.image, e.address]);
            } else {
              eventTags.push(["emoji", e.name, e.image]);
            }
          }
        });
      }

      // Create event template and publish
      const template = {
        kind: replyingTo && replyKind ? replyKind : kind,
        content,
        tags: eventTags,
        created_at: Math.floor(Date.now() / 1000),
      };

      try {
        const publishedEvent = await publish(template, relays);
        setMessage("");
        setIsPosting(false);
        setReplyingTo(undefined);
        setCustomEmojis([]);
        onNewMessage?.(publishedEvent);
      } catch (err) {
        console.error(err);
        // For unpublished events, we still need NDKEvent for compatibility
        const ndkEvent = new NDKEvent(ndk, template as NostrEvent);
        addUnpublishedEvent({ event: ndkEvent, relays });
        toast.error(t("send.error"));
        setIsPosting(false);
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

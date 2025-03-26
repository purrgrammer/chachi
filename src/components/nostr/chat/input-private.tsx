import { useState } from "react";
import { toast } from "sonner";
import { Send, Bitcoin } from "lucide-react";
import { NostrEvent } from "nostr-tools";
import { NDKRelaySet, NDKEvent, NDKKind, NDKUser } from "@nostr-dev-kit/ndk";
//import { UploadEncryptedFile } from "@/components/upload-file";
import { GIFPicker } from "@/components/gif-picker";
import { Button } from "@/components/ui/button";
import { useGroupRelays } from "@/lib/nostr/dm";
import { cn } from "@/lib/utils";
import { usePubkey } from "@/lib/account";
import { giftWrap } from "@/lib/nip-59";
import { savePrivateEvent } from "@/lib/nostr/dm";
import { AutocompleteTextarea } from "@/components/autocomplete-textarea";
import type { PrivateGroup as Group, Emoji } from "@/lib/types";
import { useTranslation } from "react-i18next";
import { useNDK } from "@/lib/ndk";

export function ChatInput({
  group,
  kind,
  showReplyPreview = true,
  replyKind,
  replyingTo,
  setReplyingTo,
  onNewMessage,
  className,
  height,
  onHeightChange,
  disabled,
  children,
}: {
  group: Group;
  kind: NDKKind;
  showReplyPreview?: boolean;
  replyKind?: NDKKind;
  replyingTo?: NostrEvent;
  setReplyingTo: (event: NostrEvent | undefined) => void;
  onNewMessage?: (event: NostrEvent) => void;
  className?: string;
  height: number;
  onHeightChange?: (height: number) => void;
  disabled?: boolean;
  children?: React.ReactNode;
}) {
  const [isPosting, setIsPosting] = useState(false);
  const ndk = useNDK();
  const relayList = useGroupRelays(group);
  const me = usePubkey();
  const canPoast = Boolean(ndk.signer);
  // message
  const [message, setMessage] = useState("");
  const [customEmojis, setCustomEmojis] = useState<Emoji[]>([]);
  const { t } = useTranslation();

  async function sendMessage(msg: string) {
    const content = msg.trim();
    if (!content) {
      return;
    }
    setIsPosting(true);
    if (content) {
      const event = new NDKEvent(ndk, {
        kind: replyingTo && replyKind ? replyKind : kind,
        content,
        tags: group.pubkeys.filter((p) => p !== me).map((p) => ["p", p]),
      } as NostrEvent);
      if (replyingTo) {
        const root = replyingTo.tags.find((t) => t[3] === "root")?.[1];
        if (root && root !== replyingTo.id) {
          event.tags.push(["e", root, "", "root"]);
          event.tags.push(["e", replyingTo.id, "", "reply"]);
        } else {
          event.tags.push(["e", replyingTo.id, "", "root"]);
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
        event.pubkey = me!;
        event.created_at = Math.floor(Date.now() / 1000);
        event.id = event.getEventHash();
        await Promise.allSettled(
          group.pubkeys.map(async (pubkey) => {
            const list = relayList
              .filter((r) => r)
              .find((r) => r!.pubkey === pubkey);
            if (!list) return;
            const relays = list.dm || list.fallback;
            const gift = await giftWrap(event, new NDKUser({ pubkey }));
            const relaySet = NDKRelaySet.fromRelayUrls(relays, ndk);
            if (pubkey === me) {
              await savePrivateEvent(
                event.rawEvent() as unknown as NostrEvent,
                gift.rawEvent() as unknown as NostrEvent,
              );
              onNewMessage?.(event.rawEvent() as NostrEvent);
            }
            return gift.publish(relaySet);
          }),
        );
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
      <div className="flex flex-row gap-1 items-center h-full">
        {children}
        <AutocompleteTextarea
          submitOnEnter
          focusAfterSubmit
          pubkeys={group.pubkeys}
          disabled={!canPoast || disabled || !me || isPosting}
          message={message}
          setMessage={setMessage}
          placeholder={canPoast ? t("message") : t("send.login-required")}
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
        {/*
        <UploadEncryptedFile
          tabIndex={1}
          // todo: add imeta tags
          onUpload={(blob) =>
            setMessage(message ? `${message} ${blob.url}` : blob.url)
          }
        />
	*/}
        <Button
          tabIndex={1}
          aria-label="Payment"
          variant="outline"
          disabled={!canPoast}
          size="icon"
          onClick={() => console.log("TODO")}
        >
          <Bitcoin />
        </Button>
        <Button
          tabIndex={2}
          aria-label="Send"
          disabled={!canPoast}
          size="icon"
          className="sm:hidden"
          onClick={() => sendMessage(message)}
        >
          <Send />
        </Button>
      </div>
    </div>
  );
}

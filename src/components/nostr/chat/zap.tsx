import { useState, useRef, useEffect } from "react";
import { motion, useInView } from "framer-motion";
import { toast } from "sonner";
import {
  Copy,
  Reply as ReplyIcon,
  SmilePlus,
  Trash,
  ShieldBan,
  Bitcoin,
} from "lucide-react";
import { NostrEvent } from "nostr-tools";
import { useNavigate } from "react-router-dom";
import { NDKEvent, NDKKind } from "@nostr-dev-kit/ndk";
import { ProfileDrawer } from "@/components/nostr/profile";
import { validateZap } from "@/lib/nip-57";
import { useCopy } from "@/lib/hooks";
import { useNDK } from "@/lib/ndk";
import { Avatar } from "@/components/nostr/avatar";
import { useRelaySet } from "@/lib/nostr";
import { usePubkey, useCanSign } from "@/lib/account";
import type { Emoji as EmojiType } from "@/components/emoji-picker";
import { LazyEmojiPicker } from "@/components/lazy/LazyEmojiPicker";
import { saveGroupEvent } from "@/lib/messages";
import { useSettings } from "@/lib/settings";
import { eventLink } from "@/lib/links";
import type { Group } from "@/lib/types";
import { useTranslation } from "react-i18next";
import { Reactions } from "@/components/nostr/reactions";
import { Zap } from "@/components/nostr/zap";
import { NewZapDialog } from "@/components/nostr/zap";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuShortcut,
} from "@/components/ui/context-menu";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface ChatZapProps {
  event: NostrEvent;
  group?: Group;
  admins: string[];
  scrollTo?: NostrEvent;
  setScrollTo?: (ev?: NostrEvent) => void;
  setReplyingTo?: (event: NostrEvent) => void;
  deleteEvent?: (event: NostrEvent) => void;
  canDelete?: (event: NostrEvent) => boolean;
}

export function ChatZap({
  event,
  group,
  admins,
  setReplyingTo,
  scrollTo,
  setScrollTo,
  canDelete,
  deleteEvent,
}: ChatZapProps) {
  // todo: gestures
  const zap = validateZap(event);
  const ndk = useNDK();
  const ref = useRef<HTMLDivElement | null>(null);
  const isInView = useInView(ref);
  const [showingEmojiPicker, setShowingEmojiPicker] = useState(false);
  const navigate = useNavigate();
  const [showingZapDialog, setShowingZapDialog] = useState(false);
  const pubkey = usePubkey();
  const isMine = zap?.pubkey === pubkey;
  const amIAdmin = pubkey && admins.includes(pubkey);
  const relaySet = useRelaySet(group ? [group.relay] : []);
  const { t } = useTranslation();
  const [, copy] = useCopy();
  const [settings] = useSettings();
  const isMobile = useIsMobile();
  const canSign = useCanSign();
  const isFocused = scrollTo?.id === zap?.id;

  useEffect(() => {
    if (isFocused && ref.current) {
      ref.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [isFocused]);

  if (!zap) return null;

  // todo: extract to hook
  async function react(e: EmojiType) {
    try {
      const ev = new NDKEvent(ndk, {
        kind: NDKKind.Reaction,
        content: e.native ? e.native : e.shortcodes,
        tags: group ? [["h", group?.id, group?.relay]] : [],
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
      setShowingEmojiPicker(false);
    }
  }

  async function kick(e: NostrEvent) {
    try {
      const ev = new NDKEvent(ndk, {
        kind: NDKKind.GroupAdminRemoveUser,
        content: "",
        tags: group
          ? [
              ["h", group.id, group.relay],
              ["p", e.pubkey],
            ]
          : [],
      } as NostrEvent);
      await ev.publish(relaySet);
      toast.success(t("chat.user.kick.success"));
      if (group) {
        saveGroupEvent(ev.rawEvent() as NostrEvent, group);
      }
    } catch (err) {
      console.error(err);
      toast.error(t("chat.user.kick.error"));
    }
  }

  function onNutzapReplyClick(ev: NostrEvent) {
    // todo: use messageKinds here
    if (
      ev.kind === NDKKind.Nutzap ||
      ev.kind === NDKKind.GroupChat ||
      ev.kind === NDKKind.Zap
    ) {
      setScrollTo?.(ev);
    } else {
      navigate(eventLink(ev, group));
    }
  }

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            className={`flex flex-row ${isMine ? "justify-end" : ""} w-full z-0 ${isFocused ? "bg-accent/30 rounded-lg" : ""}`}
          >
            <motion.div
              // Drag controls
              drag={isMobile && !isMine && canSign ? "x" : false}
              dragSnapToOrigin={true}
              dragConstraints={{ left: 20, right: 20 }}
              dragElastic={{ left: 0.2, right: 0.2 }}
              onDragEnd={(_, info) => {
                if (info.offset.x > 20) {
                  setReplyingTo?.(event);
                } else if (info.offset.x < -20) {
                  setShowingEmojiPicker(true);
                }
              }}
              ref={ref}
              className="z-0 border-none my-1 max-w-[18rem] sm:max-w-sm md:max-w-md"
            >
              <div className="flex flex-col gap-0">
                <div className="flex flex-row gap-2 items-end">
                  {isMine ? null : (
                    <ProfileDrawer
                      group={group}
                      pubkey={zap.pubkey}
                      trigger={
                        <Avatar pubkey={zap.pubkey} className="size-7" />
                      }
                    />
                  )}
                  <div
                    className={cn(
                      "flex flex-col gap-1 relative p-1 px-2 bg-background/80 rounded-md",
                      isMine
                        ? "rounded-tl-md rounded-tr-md rounded-bl-md rounded-br-none"
                        : "rounded-tl-md rounded-tr-md rounded-br-md rounded-bl-none",
                    )}
                  >
                    <Zap
                      zap={zap}
                      className={
                        isMine
                          ? "rounded-tl-md rounded-tr-md rounded-bl-md rounded-br-none"
                          : "rounded-tl-md rounded-tr-md rounded-br-md rounded-bl-none"
                      }
                      group={group}
                      animateGradient
                      showAuthor={false}
                      onReplyClick={onNutzapReplyClick}
                      classNames={{
                        singleCustomEmoji: isMine ? "ml-auto" : "",
                        onlyEmojis: isMine ? "ml-auto" : "",
                      }}
                    />
                    <Reactions
                      event={event}
                      relays={group ? [group.relay] : []}
                      kinds={[NDKKind.Nutzap, NDKKind.Zap, NDKKind.Reaction]}
                      live={isInView}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem
            className="cursor-pointer"
            onClick={() => setReplyingTo?.(event)}
          >
            {t("chat.message.reply.action")}
            <ContextMenuShortcut>
              <ReplyIcon className="w-4 h-4" />
            </ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuItem
            className="cursor-pointer"
            onClick={() => setShowingEmojiPicker(true)}
          >
            {t("chat.message.react.action")}
            <ContextMenuShortcut>
              <SmilePlus className="w-4 h-4" />
            </ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuItem
            className="cursor-pointer"
            onClick={() => setShowingZapDialog(true)}
          >
            {t("chat.message.tip.action")}
            <ContextMenuShortcut>
              <Bitcoin className="w-4 h-4" />
            </ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            className="cursor-pointer"
            onClick={() => copy(zap.content)}
          >
            {t("chat.message.copy.action")}
            <ContextMenuShortcut>
              <Copy className="w-4 h-4" />
            </ContextMenuShortcut>
          </ContextMenuItem>
          {amIAdmin && event.pubkey !== pubkey ? (
            <>
              <ContextMenuSeparator />
              <ContextMenuLabel>{t("group.info.admin")}</ContextMenuLabel>
              <ContextMenuItem
                className="cursor-pointer"
                onClick={() => kick(event)}
              >
                {t("chat.user.kick.action")}
                <ContextMenuShortcut>
                  <ShieldBan className="w-4 h-4" />
                </ContextMenuShortcut>
              </ContextMenuItem>
              {deleteEvent ? (
                <ContextMenuItem
                  className="cursor-pointer"
                  onClick={() => deleteEvent(event)}
                >
                  {t("chat.message.delete.action")}
                  <ContextMenuShortcut>
                    <Trash className="w-4 h-4 text-destructive" />
                  </ContextMenuShortcut>
                </ContextMenuItem>
              ) : null}
            </>
          ) : deleteEvent && canDelete?.(event) ? (
            <ContextMenuItem
              className="cursor-pointer"
              onClick={() => deleteEvent(event)}
            >
              {t("chat.message.delete.action")}
              <ContextMenuShortcut>
                <Trash className="w-4 h-4 text-destructive" />
              </ContextMenuShortcut>
            </ContextMenuItem>
          ) : null}
          {settings.devMode ? (
            <>
              <ContextMenuSeparator />
              <ContextMenuLabel className="text-xs font-light">
                {t("chat.debug")}
              </ContextMenuLabel>
              <ContextMenuItem
                className="cursor-pointer"
                onClick={() => console.log(event)}
              >
                Log
              </ContextMenuItem>
            </>
          ) : null}
        </ContextMenuContent>
      </ContextMenu>
      <LazyEmojiPicker
        open={showingEmojiPicker}
        onOpenChange={(open) => setShowingEmojiPicker(open)}
        onEmojiSelect={react}
      />
      {showingZapDialog ? (
        <NewZapDialog
          open
          event={event}
          pubkey={event.pubkey}
          group={group}
          onClose={() => setShowingZapDialog(false)}
        />
      ) : null}
    </>
  );
}

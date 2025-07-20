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
  Coins,
  Check,
  X,
  HandCoins,
} from "lucide-react";
import { NostrEvent } from "nostr-tools";
import { useIsMobile } from "@/hooks/use-mobile";
import { NDKEvent, NDKKind, NDKNutzap } from "@nostr-dev-kit/ndk";
import { NDKCashuWallet } from "@nostr-dev-kit/ndk-wallet";
import { User } from "@/components/nostr/user";
import { ProfileDrawer } from "@/components/nostr/profile";
import { useCopy } from "@/lib/hooks";
import { useNDK } from "@/lib/ndk";
import { Avatar } from "@/components/nostr/avatar";
import { useRelaySet } from "@/lib/nostr";
import { usePubkey, useCanSign } from "@/lib/account";
import type { Emoji as EmojiType } from "@/components/emoji-picker";
import { LazyEmojiPicker } from "@/components/lazy/LazyEmojiPicker";
import { saveGroupEvent, saveLastSeen } from "@/lib/messages";
import { useSettings } from "@/lib/settings";
import type { Group } from "@/lib/types";
import { useTranslation } from "react-i18next";
import { Reactions } from "@/components/nostr/reactions";
import { useCashuWallet } from "@/lib/wallet";
import { useNutzapStatus, saveNutzap } from "@/lib/nutzaps";
import { formatShortNumber } from "@/lib/number";
import { NewZapDialog } from "@/components/nostr/zap";
import Amount from "@/components/amount";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuShortcut,
} from "@/components/ui/context-menu";
import { useNavigate } from "react-router-dom";
import { eventLink } from "@/lib/links";
import { Nutzap } from "../nutzap";
import { cn } from "@/lib/utils";
import { useReact } from "@/lib/nostr/react";

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

export function ChatNutzap({
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
  const ndk = useNDK();
  const ref = useRef<HTMLDivElement | null>(null);
  const wallet = useCashuWallet();
  const isInView = useInView(ref);
  const [showingEmojiPicker, setShowingEmojiPicker] = useState(false);
  const navigate = useNavigate();
  const [showingZapDialog, setShowingZapDialog] = useState(false);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const nutzapStatus = useNutzapStatus(event.id);
  const redeemed = nutzapStatus === "redeemed" || nutzapStatus === "spent";
  const failed = nutzapStatus === "failed";
  const pubkey = usePubkey();
  const isMine = event.pubkey === pubkey;
  const isToMe = event.tags.some((t) => t[0] === "p" && t[1] === pubkey);
  const amIAdmin = pubkey && admins.includes(pubkey);
  const relaySet = useRelaySet(group ? [group.relay] : []);
  const { t } = useTranslation();
  const [, copy] = useCopy();
  const [settings] = useSettings();
  const isMobile = useIsMobile();
  const canSign = useCanSign();
  const isFocused = scrollTo?.id === event.id;
  const amount = event.tags.find((t) => t[0] === "amount")?.[1];
  const unit = event.tags.find((t) => t[0] === "unit")?.[1];
  const target = event.tags.find((t) => t[0] === "p")?.[1];
  const isShownInline = event.content.trim() === "" && amount && target;
  const react = useReact(event, group, t("chat.message.react.error"));

  useEffect(() => {
    if (isFocused && ref.current) {
      ref.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [isFocused]);

  async function onEmojiSelect(e: EmojiType) {
    try {
      await react(e);
    } catch (err) {
      console.error(err);
    } finally {
      setShowingEmojiPicker(false);
    }
  }

  async function kick(e: NostrEvent) {
    try {
      const ev = new NDKEvent(ndk, {
        kind: NDKKind.GroupAdminRemoveUser,
        content: "",
        tags: [
          ...(group ? [["h", group.id, group.relay]] : []),
          ["p", e.pubkey],
        ],
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

  async function redeem() {
    setIsRedeeming(true);
    try {
      if (wallet instanceof NDKCashuWallet) {
        const nutzap = NDKNutzap.from(new NDKEvent(ndk, event));
        if (nutzap) {
          await wallet.redeemNutzap(nutzap, {
            onRedeemed: (proofs) => {
              // todo: msat unit
              const amount = proofs.reduce(
                (acc, proof) => acc + proof.amount,
                0,
              );
              toast.success(
                t("nutzaps.redeem-success", {
                  amount: formatShortNumber(amount),
                }),
              );
            },
          });
        }
      }
    } catch (err) {
      console.error(err);
      saveNutzap(event, "failed");
      toast.error(t("nutzaps.redeem-error"));
    } finally {
      setIsRedeeming(false);
    }
  }

  function onNutzapReplyClick(ev: NostrEvent) {
    // todo: use messageKinds here
    if (ev.kind === NDKKind.Nutzap || ev.kind === NDKKind.GroupChat) {
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
            className={`flex flex-row ${isMine ? "justify-end" : ""} w-full z-0 ${isFocused ? "bg-accent/30 rounded-lg" : ""} ${isShownInline ? "items-center justify-center" : ""}`}
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
              className={`z-0 border-none my-1 ${isShownInline ? "" : "max-w-[19rem] sm:max-w-sm md:max-w-md"}`}
            >
              <div className="flex flex-col gap-0">
                <div
                  className={`flex flex-row gap-2 items-end ${isShownInline ? "gap-0" : ""}`}
                >
                  {isMine ? null : isShownInline ? (
                    <div className="flex flex-row gap-2 items-center">
                      <Coins className="size-5 text-muted-foreground" />
                      <User
                        pubkey={event.pubkey}
                        classNames={{ avatar: "size-7" }}
                      />
                    </div>
                  ) : (
                    <ProfileDrawer
                      group={group}
                      pubkey={event.pubkey}
                      trigger={
                        <Avatar pubkey={event.pubkey} className="size-7" />
                      }
                    />
                  )}
                  {isShownInline ? (
                    <>
                      <div className="flex flex-row items-center gap-0">
                        <Amount
                          amount={Number(amount)}
                          currency={unit}
                          size="md"
                        />
                      </div>
                      <User pubkey={target} classNames={{ avatar: "size-7" }} />
                    </>
                  ) : (
                    <div
                      className={cn(
                        "flex flex-col gap-1 relative p-1 px-2 bg-background/80",
                        isMine
                          ? "rounded-tl-md rounded-tr-md rounded-bl-md rounded-br-none"
                          : "rounded-tl-md rounded-tr-md rounded-br-md rounded-bl-none",
                      )}
                    >
                      <Nutzap
                        className={
                          isMine
                            ? "rounded-tl-md rounded-tr-md rounded-bl-md rounded-br-none"
                            : "rounded-tl-md rounded-tr-md rounded-br-md rounded-bl-none"
                        }
                        event={event}
                        group={group}
                        showAuthor={false}
                        animateGradient
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
                  )}
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
          {isToMe ? (
            <ContextMenuItem
              className="cursor-pointer"
              disabled={isRedeeming || redeemed || failed}
              onClick={redeem}
            >
              {failed
                ? t("chat.message.redeem.failed")
                : redeemed
                  ? t("chat.message.redeem.redeemed")
                  : t("chat.message.redeem.action")}
              <ContextMenuShortcut>
                {failed ? (
                  <X className="w-4 h-4 text-red-300" />
                ) : redeemed ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <HandCoins className="w-4 h-4" />
                )}
              </ContextMenuShortcut>
            </ContextMenuItem>
          ) : null}
          <ContextMenuSeparator />
          <ContextMenuItem
            className="cursor-pointer"
            onClick={() => copy(event.content)}
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
              {group ? (
                <ContextMenuItem
                  className="cursor-pointer"
                  onClick={() => saveLastSeen(event, group)}
                >
                  {t("chat.message.save-as-last-seen")}
                </ContextMenuItem>
              ) : null}
            </>
          ) : null}
        </ContextMenuContent>
      </ContextMenu>
      <LazyEmojiPicker
        open={showingEmojiPicker}
        onOpenChange={(open) => setShowingEmojiPicker(open)}
        onEmojiSelect={onEmojiSelect}
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

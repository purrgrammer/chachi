import { useState } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { NostrEvent } from "nostr-tools";
import { Bitcoin } from "lucide-react";
import Amount, { CurrencyIcon } from "@/components/amount";
import { Invoice } from "@/components/ln";
import { Button } from "@/components/ui/button";
import { A, E } from "@/components/nostr/event";
import {
  useRichText,
  RichText,
  BlockFragment,
  EmojiFragment,
} from "@/components/rich-text";
import { Emoji } from "@/components/emoji";
import { Input } from "@/components/ui/input";
import { AutocompleteTextarea } from "@/components/autocomplete-textarea";
import { User } from "@/components/nostr/user";
import { NDKNutzap } from "@nostr-dev-kit/ndk";
import { validateZap, Zap as ZapType } from "@/lib/nip-57";
import { formatShortNumber } from "@/lib/number";
import {
  HUGE_AMOUNT,
  useZapAmounts,
  useIncreaseZapAmount,
  useNutzap,
  useZap,
  useLNURLPay,
  fetchInvoice,
} from "@/lib/zap";
import { useProfile, useRelayList } from "@/lib/nostr";
import { useMintList } from "@/lib/cashu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { WalletSelector } from "@/components/wallet";
import type { Group, Emoji as EmojiType } from "@/lib/types";
import { useRelays } from "@/lib/nostr";
import { usePubkey, useCanSign } from "@/lib/account";
import { useNDKWallets, useCashuWallet } from "@/lib/wallet";
import { cn } from "@/lib/utils";

export function NewZapDialog({
  open,
  onClose,
  onZap,
  event,
  pubkey,
  group,
  trigger,
  reply,
  zapType = "nip-61",
  title,
  description,
  defaultAmount = 21,
}: {
  open?: boolean;
  onClose?: () => void;
  onZap?: (e?: NostrEvent) => void;
  event?: NostrEvent;
  pubkey: string;
  group?: Group;
  trigger?: React.ReactNode;
  reply?: string;
  zapType?: "nip-57" | "nip-61";
  title?: string;
  description?: string;
  defaultAmount?: number;
}) {
  const { t } = useTranslation();
  const amounts = useZapAmounts();
  const increaseZapAmount = useIncreaseZapAmount();
  const [customEmojis, setCustomEmojis] = useState<EmojiType[]>([]);
  const [isOpen, setIsOpen] = useState(open);
  const [isZapping, setIsZapping] = useState(false);
  const [invoice, setInvoice] = useState<string | null>(null);
  const [amount, setAmount] = useState(String(defaultAmount));
  const [message, setMessage] = useState(reply || "");
  const { data: profile } = useProfile(pubkey);
  const name = profile?.name || pubkey.slice(0, 6);
  const canSign = useCanSign();
  const [ndkWallets] = useNDKWallets();
  const cashuWallet = useCashuWallet();
  const hasWallets = ndkWallets.length > 0 || Boolean(cashuWallet);
  const myRelays = useRelays();
  const { data: relayList } = useRelayList(pubkey);
  const { data: mintList } = useMintList(pubkey);
  const relays = Array.from(
    new Set<string>(
      zapType === "nip-61" && mintList && group
        ? [group.relay, ...mintList.relays, ...myRelays]
        : relayList && group
          ? [group.relay, ...relayList, ...myRelays]
          : relayList
            ? [...relayList, ...myRelays]
            : group
              ? [group.relay, ...myRelays]
              : myRelays,
    ),
  );
  const sendNutzap = useNutzap(pubkey, relays, event);
  const sendZap = useZap(pubkey, relays, event);
  const lud16 = profile?.lud16 || profile?.lud06;
  const { data: lnurlParams } = useLNURLPay(lud16);

  function onOpenChange(open: boolean) {
    setIsOpen(open);
    if (!open) {
      onClose?.();
      setAmount("21");
      setCustomEmojis([]);
      setMessage("");
      setInvoice(null);
    }
  }

  async function fetchInvoiceForPayment() {
    try {
      // For both NIP-57 and NIP-61, we need to fetch a Lightning invoice
      // The difference is in the metadata, but both result in a Lightning payment
      if (!lnurlParams) {
        throw new Error("No Lightning address found for this user");
      }

      const invoiceResponse = await fetchInvoice(
        lnurlParams,
        Number(amount),
        // For invoice-only mode, we don't create a zap event
        // The user will pay manually via Lightning
        undefined,
      );

      if (invoiceResponse.pr) {
        setInvoice(invoiceResponse.pr);
        toast.success(t("zap.dialog.invoice-generated"));
      } else {
        throw new Error("Failed to generate invoice");
      }
    } catch (err) {
      console.error("Invoice fetch error:", err);
      toast.error(t("zap.dialog.invoice-error"));
    }
  }

  async function zap() {
    try {
      setIsZapping(true);

      // If user cannot sign OR has no wallets configured, fetch invoice instead of trying to create zap
      if (!canSign || !hasWallets) {
        await fetchInvoiceForPayment();
        return;
      }

      if (zapType === "nip-57") {
        const tags = [
          ...(group ? [["h", group.id, group.relay]] : []),
          ...(event ? [["e", event.id]] : []),
          ...customEmojis.flatMap((e) =>
            e.name && e.image ? [["emoji", e.name, e.image]] : [],
          ),
        ];
        const results = await sendZap(message.trim(), Number(amount), tags);
        // todo: do the same with nutzaps, could be splitted too
        for (const split of results.entries()) {
          const [key, value] = split;
          const { amount, pubkey } = key;
          if (value && !(value instanceof Error)) {
            onZap?.();
            setIsZapping(false);
            toast.success(
              t("zap.dialog.success", {
                amount: formatShortNumber(Number(amount) / 1000),
                name:
                  profile?.name || profile?.display_name || pubkey.slice(0, 6),
              }),
            );
          } else {
            toast.error(
              t("zap.dialog.error", {
                amount: formatShortNumber(Number(amount)),
                name:
                  profile?.name || profile?.display_name || pubkey.slice(0, 6),
              }),
            );
          }
        }
      } else {
        const tags = [
          ...(group ? [["h", group.id, group.relay]] : []),
          ...customEmojis.flatMap((e) =>
            e.name && e.image ? [["emoji", e.name, e.image]] : [],
          ),
        ];
        await sendNutzap(message.trim(), Number(amount), tags, (nutzap) => {
          if (nutzap instanceof NDKNutzap) {
            onOpenChange(false);
            onZap?.(nutzap.rawEvent() as NostrEvent);
            toast.success(
              t("zap.dialog.success", {
                amount: formatShortNumber(
                  nutzap.unit === "msat" ? nutzap.amount / 1000 : nutzap.amount,
                ),
                name:
                  profile?.name || profile?.display_name || pubkey.slice(0, 6),
              }),
            );
          }
        });
      }
      increaseZapAmount(Number(amount));
    } catch (err) {
      console.error(err);
      toast.error(t("zap.dialog.fail"));
    } finally {
      setIsZapping(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {title ? title : t("zap.dialog.title", { name })}
          </DialogTitle>
          <DialogDescription>
            {description ? description : t("zap.dialog.description", { name })}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center gap-4">
          <AnimatePresence initial={false}>
            {invoice ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Invoice
                  invoice={invoice}
                  picture={profile?.picture}
                  showSummary
                />
              </motion.div>
            ) : (
              <motion.div
                className="flex flex-col items-center justify-center gap-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex flex-row gap-4 items-center mx-2">
                  <Input
                    disabled={isZapping}
                    type="number"
                    className="w-full text-center font-mono text-6xl h-15"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                  <CurrencyIcon size="3xl" />
                </div>
                <div className="flex flex-row flex-wrap gap-1.5">
                  {amounts.map((a) => (
                    <Button
                      key={a}
                      variant="amount"
                      size="tiny"
                      onClick={() => setAmount(String(a))}
                    >
                      {formatShortNumber(a)}
                    </Button>
                  ))}
                </div>
                <AutocompleteTextarea
                  disabled={isZapping}
                  group={group}
                  message={message}
                  setMessage={setMessage}
                  placeholder={t("zap.dialog.message-placeholder")}
                  minRows={3}
                  maxRows={6}
                  onCustomEmojisChange={setCustomEmojis}
                />
              </motion.div>
            )}
            {invoice ? null : (
              <>
                <WalletSelector disabled={isZapping} />
                <motion.div className="w-full">
                  <Button
                    disabled={!amount || isZapping || Number(amount) <= 0}
                    onClick={zap}
                    className="w-full mt-3"
                  >
                    {t("zap.dialog.tip", {
                      amount: formatShortNumber(Number(amount)),
                    })}
                  </Button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function NewZap({
  event,
  group,
  onZap,
}: {
  event: NostrEvent;
  group?: Group;
  onZap: (e?: NostrEvent) => void;
}) {
  return (
    <NewZapDialog
      event={event}
      pubkey={event.pubkey}
      group={group}
      open={false}
      onZap={onZap}
      trigger={
        <Button variant="action" size="icon">
          <Bitcoin />
        </Button>
      }
    />
  );
}

export function ZapReply({
  event,
  group,
}: {
  event: NostrEvent;
  group?: Group;
}) {
  const zap = validateZap(event);
  return zap ? (
    <Zap
      zap={zap}
      group={group}
      animateGradient={false}
      showRef={false}
      showTarget={false}
    />
  ) : (
    <span>Invalid zap</span>
  );
}

export function ZapDetail({
  event,
  group,
}: {
  event: NostrEvent;
  group?: Group;
}) {
  const zap = validateZap(event);
  return zap ? (
    <Zap zap={zap} group={group} animateGradient={false} />
  ) : (
    <span>Invalid zap</span>
  );
}

export function ZapPreview({
  event,
  group,
}: {
  event: NostrEvent;
  group?: Group;
}) {
  const zap = validateZap(event);
  return zap ? <Zap zap={zap} group={group} animateGradient={false} /> : null;
}

export function Zap({
  zap,
  className,
  group,
  animateGradient,
  showAuthor = true,
  onReplyClick,
  classNames,
  showRef = true,
  showTarget = true,
}: {
  zap: ZapType;
  className?: string;
  group?: Group;
  animateGradient?: boolean;
  showAuthor?: boolean;
  onReplyClick?: (ev: NostrEvent) => void;
  classNames?: {
    singleCustomEmoji?: string;
    onlyEmojis?: string;
  };
  showRef?: boolean;
  showTarget?: boolean;
}) {
  const pubkey = usePubkey();
  const fragments = useRichText(
    zap.content.trim(),
    {
      emojis: true,
    },
    zap.tags,
  );
  const isSingleCustomEmoji =
    fragments.length === 1 &&
    fragments[0].type === "block" &&
    fragments[0].nodes.length === 1 &&
    fragments[0].nodes[0].type === "emoji";
  const singleCustomEmoji = isSingleCustomEmoji
    ? ((fragments[0] as BlockFragment).nodes[0] as EmojiFragment)
    : null;
  const isOnlyEmojis =
    /^\p{Emoji_Presentation}{1}\s*\p{Emoji_Presentation}{0,4}$/u.test(
      zap.content.trim(),
    );
  const content =
    isSingleCustomEmoji && singleCustomEmoji ? (
      <div
        className={zap.pubkey === pubkey ? "flex items-end justify-end" : ""}
      >
        <Emoji
          key={singleCustomEmoji.name}
          name={singleCustomEmoji.name}
          image={singleCustomEmoji.image}
          className={cn(
            `w-32 h-32 aspect-auto rounded-md`,
            classNames?.singleCustomEmoji,
          )}
        />
      </div>
    ) : isOnlyEmojis ? (
      <span className={cn("text-7xl", classNames?.onlyEmojis)}>
        {zap.content.trim()}
      </span>
    ) : (
      <RichText tags={zap.tags} options={{ syntax: true }}>
        {zap.content.trim()}
      </RichText>
    );
  // todo: emoji, single custom emoji
  return (
    <div
      className={cn(
        `flex flex-col gap-1 ${animateGradient ? "rounded-md border-gradient" : ""} ${animateGradient && zap.amount >= HUGE_AMOUNT ? "border-animated-gradient" : ""}`,
        className,
      )}
    >
      <div className="flex flex-row gap-3 justify-between">
        {showAuthor ? (
          <User pubkey={zap.pubkey} classNames={{ avatar: "size-4" }} />
        ) : null}
        <div className="flex items-center">
          <Amount amount={zap.amount} size="md" showIcon={true} />
        </div>
        {showTarget && zap.p ? (
          <User
            pubkey={zap.p}
            classNames={{ avatar: "size-4", name: "font-normal" }}
          />
        ) : null}
      </div>
      {showRef && zap.e ? (
        <E
          id={zap.e}
          group={group}
          pubkey={zap.p}
          relays={group ? [group.relay] : []}
          showReactions={false}
          asReply
          onClick={onReplyClick}
        />
      ) : showRef && zap.a && !zap.a.startsWith("39000") ? (
        <A
          address={zap.a}
          group={group}
          showReactions={false}
          asReply
          relays={group ? [group.relay] : []}
          onClick={onReplyClick}
        />
      ) : null}
      {zap.content.trim().length > 0 ? content : null}
    </div>
  );
}

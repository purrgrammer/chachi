import { useState } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { NostrEvent } from "nostr-tools";
import { Bitcoin } from "lucide-react";
import { Invoice } from "@/components/ln";
import { Button } from "@/components/ui/button";
import { RichText } from "@/components/rich-text";
import { Embed } from "@/components/nostr/detail";
import { Input } from "@/components/ui/input";
import { AutocompleteTextarea } from "@/components/autocomplete-textarea";
import { User } from "@/components/nostr/user";
import { Event, Address } from "@/components/nostr/event";
import { NDKKind } from "@nostr-dev-kit/ndk";
import { validateZap, Zap as ZapType } from "@/lib/nip-57";
import { formatShortNumber } from "@/lib/number";
import {
  HUGE_AMOUNT,
  useZapAmounts,
  useIncreaseZapAmount,
  useZap,
} from "@/lib/zap";
import { useProfile, useRelayList } from "@/lib/nostr";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useGroup } from "@/lib/nostr/groups";
import type { Group, Emoji } from "@/lib/types";

export function NewZapDialog({
  open,
  onClose,
  event,
  group,
  trigger,
  reply,
}: {
  open?: boolean;
  onClose?: () => void;
  event: NostrEvent;
  group?: Group;
  trigger?: React.ReactNode;
  reply?: string;
}) {
  const { t } = useTranslation();
  const amounts = useZapAmounts();
  const { data: metadata } = useGroup(group);
  const increaseZapAmount = useIncreaseZapAmount();
  const [customEmojis, setCustomEmojis] = useState<Emoji[]>([]);
  const [isOpen, setIsOpen] = useState(open);
  const [isZapping, setIsZapping] = useState(false);
  const [invoice, setInvoice] = useState<string | null>(null);
  const [amount, setAmount] = useState("21");
  const [message, setMessage] = useState(reply || "");
  const { data: profile } = useProfile(event.pubkey);
  const name = profile?.name || event.pubkey.slice(0, 6);
  const { data: relayList } = useRelayList(event.pubkey);
  const relays =
    relayList && group
      ? [group.relay, ...relayList]
      : relayList
        ? relayList
        : group
          ? [group.relay]
          : [];
  const sendZap = useZap(event.pubkey, relays, event);

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

  async function onZap() {
    try {
      setIsZapping(true);
      await sendZap(
        message,
        Number(amount) * 1000,
        [
          ...(group ? [["h", group.id, group.relay]] : []),
          ...(group && metadata?.pubkey
            ? [["a", `${NDKKind.GroupMetadata}:${metadata.pubkey}:${group.id}`]]
            : []),
          ...customEmojis.flatMap((e) =>
            e.name && e.image ? [["emoji", e.name, e.image]] : [],
          ),
        ],
        (nutzap) => {
          onOpenChange(false);
          toast.success(
            t("zap.dialog.success", {
              amount: formatShortNumber(nutzap.amount),
            }),
          );
        },
      );
      increaseZapAmount(Number(amount));
    } catch (err) {
      console.error(err);
      toast.error(t("zap.dialog.error"));
    } finally {
      setIsZapping(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      {trigger}
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("zap.dialog.title", { name })}</DialogTitle>
          <DialogDescription>
            {t("zap.dialog.description", { name })}
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
                <Invoice invoice={invoice} picture={profile?.picture} />
              </motion.div>
            ) : (
              <motion.div
                className="flex flex-col items-center justify-center gap-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Embed
                  event={event}
                  group={group}
                  relays={[]}
                  showReactions={false}
                />
                <div className="flex flex-row gap-4 items-center mx-2">
                  <Input
                    type="number"
                    className="w-full text-center font-mono text-6xl h-15"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                  <Bitcoin className="size-14 text-muted-foreground" />
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
              <motion.div className="w-full">
                <Button
                  disabled={!amount || isZapping}
                  onClick={onZap}
                  className="w-full mt-3"
                >
                  <Bitcoin className="text-muted-foreground" />
                  {t("zap.dialog.tip", {
                    amount: formatShortNumber(Number(amount)),
                  })}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function NewZap({ event, group }: { event: NostrEvent; group?: Group }) {
  return (
    <NewZapDialog
      event={event}
      group={group}
      open={false}
      trigger={
        <DialogTrigger asChild>
          <Button
            variant="action"
            size="icon"
            className="bg-primary rounded-full"
          >
            <Bitcoin />
          </Button>
        </DialogTrigger>
      }
    />
  );
}

function E({
  id,
  group,
  pubkey,
}: {
  id: string;
  pubkey?: string;
  group?: Group;
}) {
  return (
    <Event
      id={id}
      group={group}
      pubkey={pubkey}
      relays={[]}
      showReactions={false}
    />
  );
}

function A({ address, group }: { address: string; group?: Group }) {
  const [k, pubkey, d] = address.split(":");
  return (
    <Address
      kind={Number(k)}
      pubkey={pubkey}
      identifier={d}
      group={group}
      relays={[]}
      showReactions={false}
    />
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
  return zap ? (
    <Zap zap={zap} group={group} animateGradient={false} />
  ) : (
    <span>Invalid zap</span>
  );
}

export function Zap({
  zap,
  group,
  animateGradient,
  embedMention = true,
}: {
  zap: ZapType;
  group?: Group;
  animateGradient?: boolean;
  embedMention?: boolean;
}) {
  return (
    <div
      className={`flex flex-col gap-2 ${animateGradient ? "rounded-md border-gradient" : ""} ${animateGradient && zap.amount >= HUGE_AMOUNT ? "border-animated-gradient" : ""}`}
    >
      <div className="flex flex-row gap-3 justify-between">
        <User pubkey={zap.pubkey} classNames={{ avatar: "size-4" }} />
        <div className="flex items-center">
          <span className="font-mono text-lg">
            {formatShortNumber(zap.amount)}
          </span>
          <span className="text-muted-foreground">
            <Bitcoin className="size-4" />
          </span>
        </div>
        {zap.p ? (
          <User pubkey={zap.p} classNames={{ avatar: "size-4" }} />
        ) : null}
      </div>
      {zap.e && embedMention ? (
        <E id={zap.e} group={group} pubkey={zap.p} />
      ) : zap.a && embedMention ? (
        <A address={zap.a} group={group} />
      ) : null}
      {zap.content.trim().length > 0 ? (
        <RichText tags={zap.tags} group={group}>
          {zap.content}
        </RichText>
      ) : null}
    </div>
  );
}

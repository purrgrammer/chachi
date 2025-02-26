import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { NutzapContent } from "@/components/nostr/nutzap";
import {
  X,
  Zap as ZapIcon,
  Bitcoin,
  HandCoins,
  ArrowDownRight,
  ArrowUpRight,
  MessagesSquare,
  RotateCw,
  Check,
  SquareArrowOutUpRight,
  MessageSquareOff,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { NDKEvent, NDKNutzap } from "@nostr-dev-kit/ndk";
import { NDKCashuWallet } from "@nostr-dev-kit/ndk-wallet";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { HUGE_AMOUNT } from "@/lib/zap";
import { E, A } from "@/components/nostr/event";
import { Header } from "@/components/header";
import {
  useRichText,
  RichText,
  BlockFragment,
  EmojiFragment,
} from "@/components/rich-text";
import { Emoji } from "@/components/emoji";
import { Button } from "@/components/ui/button";
import { User } from "@/components/nostr/user";
import { formatRelativeTime } from "@/lib/time";
import { formatShortNumber } from "@/lib/number";
import { validateZap } from "@/lib/nip-57";
import type { Zap as ZapType } from "@/lib/nip-57";
import { validateNutzap } from "@/lib/nip-61";
import { MintLink } from "@/components/mint";
import { GroupName, GroupPicture } from "@/components/nostr/groups/metadata";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Pubkey } from "@/components/nostr/pubkey";
import { groupURL } from "@/lib/groups";
import { useNDK } from "@/lib/ndk";
import { useCashuWallet } from "@/lib/wallet";
import { useSentZaps, useReceivedZaps } from "@/lib/zap";
import { useNutzaps, useSentNutzaps } from "@/lib/cashu";
import { Nutzap as NutzapEvent } from "@/lib/db";
import { usePubkey } from "@/lib/account";
import { useRelays } from "@/lib/nostr";
import { saveNutzap } from "@/lib/nutzaps";
import { cn } from "@/lib/utils";
import { dedupeBy } from "@/lib/utils";

export function ZapContent({
  zap,
  classNames,
}: {
  zap: ZapType;
  classNames?: {
    singleCustomEmoji?: string;
    onlyEmojis?: string;
  };
}) {
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
  return isSingleCustomEmoji && singleCustomEmoji ? (
    <Emoji
      key={singleCustomEmoji.name}
      name={singleCustomEmoji.name}
      image={singleCustomEmoji.image}
      className={cn(
        `w-32 h-32 aspect-auto rounded-md`,
        classNames?.singleCustomEmoji,
      )}
    />
  ) : isOnlyEmojis ? (
    <span className={cn("text-7xl", classNames?.onlyEmojis)}>
      {zap.content.trim()}
    </span>
  ) : (
    <RichText tags={zap.tags}>{zap.content.trim()}</RichText>
  );
}

function Zap({ zap, showReceiver }: { zap: ZapType; showReceiver?: boolean }) {
  const { t } = useTranslation();
  const id = zap.tags.find((t) => t[0] === "h")?.[1];
  const relay = zap.tags.find((t) => t[0] === "h")?.[2];
  const group = id && relay ? { id, relay } : undefined;
  const isHugeAmount = zap ? zap.amount >= HUGE_AMOUNT : false;
  const relays = useRelays();
  return (
    <Card className="z-0 relative rounded-md bg-background/80">
      <CardHeader className="bg-background/80">
        <div className="flex flex-row items-center justify-between">
          <CardTitle>
            {showReceiver && zap.p ? (
              <User
                pubkey={zap.p}
                classNames={{ avatar: "size-6", name: "font-normal" }}
              />
            ) : (
              <User
                pubkey={zap.pubkey}
                classNames={{ avatar: "size-6", name: "font-normal" }}
              />
            )}
          </CardTitle>
          <div className="flex flex-row gap-2 items-center">
            {group ? (
              <Link
                to={groupURL(group)}
                className="text-sm hover:cursor-pointer hover:underline hover:decoration-dotted"
              >
                <div className="flex flex-row items-center gap-1.5">
                  <MessagesSquare className="size-3 text-muted-foreground" />
                  <div className="flex flex-row items-center gap-1">
                    <GroupPicture group={group} className="size-3" />
                    <GroupName group={group} className="text-xs" />
                  </div>
                </div>
              </Link>
            ) : null}
            <span className="text-xs font-light text-muted-foreground">
              {formatRelativeTime(zap.created_at)}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="bg-background/80">
        <div
          className={cn(
            "flex flex-row gap-6 items-center justify-between border-gradient",
            isHugeAmount ? "border-animated-gradient" : "",
          )}
        >
          {zap.content.trim() ? (
            <ZapContent
              zap={zap}
              classNames={{
                singleCustomEmoji: "h-12 w-12",
                onlyEmojis: "text-5xl",
              }}
            />
          ) : (
            <div className="flex flex-row items-center gap-1.5">
              <MessageSquareOff className="size-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {t("nutzaps.no-message")}
              </span>
            </div>
          )}
          <div className="flex flex-col gap-3 items-center justify-center">
            <div className="flex flex-col items-end gap-0.5">
              <div className="flex flex-row items-center gap-1">
                {/* todo: unit */}
                <Bitcoin className="size-8 text-muted-foreground" />
                <span className="font-mono text-5xl">
                  {formatShortNumber(zap.amount)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="bg-background/80">
        <div className="flex flex-col gap-2 w-full items-end">
          {zap.e || zap.a ? (
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="tiny">
                  <div className="flex flex-row items-center gap-1">
                    <SquareArrowOutUpRight />
                    {t("nutzaps.open")}
                  </div>
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-transparent border-none">
                {zap.e ? (
                  <E
                    id={zap.e}
                    pubkey={zap.p}
                    group={group}
                    relays={group ? [group.relay] : relays}
                    showReactions={false}
                  />
                ) : zap.a ? (
                  <A
                    address={zap.a}
                    group={group}
                    relays={group ? [group.relay] : relays}
                    showReactions={false}
                  />
                ) : null}
              </DialogContent>
            </Dialog>
          ) : null}
        </div>
      </CardFooter>
    </Card>
  );
}
function Nutzap({
  event,
  showReceiver,
}: {
  event: NutzapEvent;
  showReceiver?: boolean;
}) {
  const zap = validateNutzap(event);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const redeemed = event.status === "redeemed" || event.status === "spent";
  const failed = event.status === "failed";
  const wallet = useCashuWallet();
  const { t } = useTranslation();
  const ndk = useNDK();
  const me = usePubkey();
  const id = event.tags.find((t) => t[0] === "h")?.[1];
  const relay = event.tags.find((t) => t[0] === "h")?.[2];
  const group = id && relay ? { id, relay } : undefined;
  const isHugeAmount = zap ? zap.amount >= HUGE_AMOUNT : false;
  async function redeem() {
    setIsRedeeming(true);
    try {
      if (wallet instanceof NDKCashuWallet) {
        const nutzap = NDKNutzap.from(new NDKEvent(ndk, event));
        if (nutzap) {
          await wallet.redeemNutzap(nutzap, {
            onRedeemed: (proofs) => {
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
            onTxEventCreated: (txEvent) => {
              saveNutzap(event, "redeemed", txEvent.id, txEvent.created_at);
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

  if (!zap) {
    return (
      <span className="text-xs text-muted-foreground">
        {t("nutzaps.invalid")}
      </span>
    );
  }

  return (
    <Card className="z-0 relative rounded-md bg-background/80">
      <CardHeader className="bg-background/80">
        <div className="flex flex-row items-center justify-between">
          <CardTitle>
            {showReceiver && zap.p ? (
              <User
                pubkey={zap.p}
                classNames={{ avatar: "size-6", name: "font-normal" }}
              />
            ) : (
              <User
                pubkey={zap.pubkey}
                classNames={{ avatar: "size-6", name: "font-normal" }}
              />
            )}
          </CardTitle>
          <div className="flex flex-row gap-2 items-center">
            {group ? (
              <Link
                to={groupURL(group)}
                className="text-sm hover:cursor-pointer hover:underline hover:decoration-dotted"
              >
                <div className="flex flex-row items-center gap-1.5">
                  <MessagesSquare className="size-3 text-muted-foreground" />
                  <div className="flex flex-row items-center gap-1">
                    <GroupPicture group={group} className="size-3" />
                    <GroupName group={group} className="text-xs" />
                  </div>
                </div>
              </Link>
            ) : null}
            <span className="text-xs font-light text-muted-foreground">
              {formatRelativeTime(zap.created_at)}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="bg-background/80">
        <div
          className={cn(
            "flex flex-row gap-6 items-center justify-between border-gradient",
            isHugeAmount ? "border-animated-gradient" : "",
          )}
        >
          {event.content.trim() ? (
            <NutzapContent
              event={event}
              zap={zap}
              classNames={{
                singleCustomEmoji: "h-12 w-12",
                onlyEmojis: "text-5xl",
              }}
            />
          ) : (
            <div className="flex flex-row items-center gap-1.5">
              <MessageSquareOff className="size-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {t("nutzaps.no-message")}
              </span>
            </div>
          )}
          <div className="flex flex-col gap-3 items-center justify-center">
            <div className="flex flex-col items-end gap-0.5">
              <div className="flex flex-row items-center gap-1">
                {/* todo: unit */}
                <Bitcoin className="size-8 text-muted-foreground" />
                <span className="font-mono text-5xl">
                  {formatShortNumber(zap.amount)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="bg-background/80">
        <div className="flex flex-col gap-2 w-full">
          <div className="flex flex-row items-center justify-between">
            <div className="">
              {zap.p2pk ? (
                <Pubkey isCashu pubkey={zap.p2pk} chunkSize={8} />
              ) : null}
              <MintLink
                includeLandmark
                url={zap.mint}
                classNames={{ icon: "size-3", name: "text-xs text-foreground" }}
              />
            </div>
            <div className="flex flex-row gap-1 items-center">
              {zap.p === me ? (
                <Button
                  disabled={!wallet || failed || redeemed}
                  variant="ghost"
                  size="tiny"
                  onClick={redeem}
                >
                  {failed ? (
                    <X className="text-red-500" />
                  ) : redeemed ? (
                    <Check className="text-green-500" />
                  ) : isRedeeming ? (
                    <RotateCw className="animate-spin" />
                  ) : (
                    <HandCoins />
                  )}
                  {failed
                    ? t("nutzaps.failed")
                    : redeemed
                      ? t("nutzaps.redeemed")
                      : t("nutzaps.redeem")}
                </Button>
              ) : null}

              {zap.e || zap.a ? (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="tiny">
                      <div className="flex flex-row items-center gap-1">
                        <SquareArrowOutUpRight />
                        {t("nutzaps.open")}
                      </div>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-transparent border-none">
                    {zap.e ? (
                      <E id={zap.e} pubkey={zap.p} showReactions={false} />
                    ) : zap.a ? (
                      <A address={zap.a} showReactions={false} />
                    ) : null}
                  </DialogContent>
                </Dialog>
              ) : null}
            </div>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}

function Sent() {
  const { t } = useTranslation();
  const sentNutzaps = useSentNutzaps();
  const { events: sentZaps } = useSentZaps();
  const zaps = useMemo(() => {
    return dedupeBy(sentZaps, "id")
      .map(validateZap)
      .filter(Boolean)
      .map((zap) => ({ type: "nip-57" as ZapKind, zap: zap! as ZapType }));
  }, [sentZaps]);
  const nutzaps = useMemo(() => {
    return dedupeBy(sentNutzaps, "id").map((zap) => ({
      type: "nip-61" as ZapKind,
      zap: zap! as NutzapEvent,
    }));
  }, [sentNutzaps]);
  const sorted: AllZaps = useMemo(() => {
    const s = [...zaps, ...nutzaps];
    s.sort((a, b) => b.zap.created_at - a.zap.created_at);
    return s;
  }, [zaps, nutzaps]);

  return (
    <div className="flex flex-col gap-2 w-full">
      {sorted.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <span className="text-xs text-muted-foreground">
            {t("nutzaps.no-sent")}
          </span>
        </div>
      ) : null}
      {sorted.map((event) =>
        event.type === "nip-61" ? (
          <Nutzap
            showReceiver
            key={event.zap.id}
            event={event.zap as NutzapEvent}
          />
        ) : (
          <Zap showReceiver key={event.zap.id} zap={event.zap as ZapType} />
        ),
      )}
    </div>
  );
}

type ZapKind = "nip-57" | "nip-61";
// fixme: proper type
type Nip57Zap = { type: ZapKind; zap: ZapType };
type Nip61Zap = { type: ZapKind; zap: NutzapEvent };
type BothZaps = Nip57Zap | Nip61Zap;
type AllZaps = BothZaps[];

function Received() {
  const { t } = useTranslation();

  const nutzaps = useNutzaps();
  const { events: receivedZaps } = useReceivedZaps();
  const zaps = useMemo(() => {
    return dedupeBy(receivedZaps, "id")
      .map(validateZap)
      .filter(Boolean)
      .map((zap) => ({ type: "nip-57" as ZapKind, zap: zap! as ZapType }));
  }, [receivedZaps]);

  const sorted: AllZaps = useMemo(() => {
    const s = [
      ...zaps,
      ...nutzaps.map((zap) => ({
        type: "nip-61" as ZapKind,
        zap: zap! as NutzapEvent,
      })),
    ];
    s.sort((a, b) => b.zap.created_at - a.zap.created_at);
    return s;
  }, [zaps, nutzaps]);

  return (
    <div className="flex flex-col gap-2 w-full">
      {sorted.length === 0 ? (
        <div className="flex items-center justify-center py-12 w-full">
          <span className="text-xs text-muted-foreground">
            {t("nutzaps.no-received")}
          </span>
        </div>
      ) : null}
      {sorted.map((event) =>
        event.type === "nip-61" ? (
          <Nutzap key={event.zap.id} event={event.zap as NutzapEvent} />
        ) : (
          <Zap key={event.zap.id} zap={event.zap as ZapType} />
        ),
      )}
    </div>
  );
}

function MyNutzaps() {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-center p-2">
      <div className="w-[calc(100vw-2rem)] sm:w-[420px] md:w-[510px]">
        <Tabs defaultValue="recv">
          <TabsList className="w-full bg-background">
            <TabsTrigger value="recv">
              <div className="flex flex-row items-center gap-1.5">
                <ArrowDownRight className="size-4" />
                {t("nutzaps.received")}
              </div>
            </TabsTrigger>
            <TabsTrigger value="send">
              <div className="flex flex-row items-center gap-1.5">
                <ArrowUpRight className="size-4" />
                {t("nutzaps.sent")}
              </div>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="recv">
            <Received />
          </TabsContent>
          <TabsContent value="send">
            <Sent />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
// todo: reply/react/zap zaps

export default function Zaps() {
  const { t } = useTranslation();
  const pubkey = usePubkey();
  return (
    <div>
      <Header>
        <div className="flex flex-row items-center gap-1.5">
          <ZapIcon className="size-5 text-muted-foreground" />
          <h1>{t("nutzaps.title")}</h1>
        </div>
      </Header>
      {pubkey ? (
        <MyNutzaps />
      ) : (
        <span className="text-sm text-muted-foreground">
          {t("nutzaps.log-in")}
        </span>
      )}
    </div>
  );
}

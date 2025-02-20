import { useState } from "react";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { NutzapContent } from "@/components/nostr/nutzap";
import {
  Zap as ZapIcon,
  Bitcoin,
  HandCoins,
  ArrowDownRight,
  ArrowUpRight,
  MessagesSquare,
  RotateCw,
  Check,
  SquareArrowOutUpRight,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { NDKEvent, NDKNutzap } from "@nostr-dev-kit/ndk";
import { NDKCashuWallet } from "@nostr-dev-kit/ndk-wallet";
import { NostrEvent } from "nostr-tools";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { HUGE_AMOUNT } from "@/lib/zap";
import { E, A } from "@/components/nostr/event";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { User } from "@/components/nostr/user";
import { formatRelativeTime } from "@/lib/time";
import { formatShortNumber } from "@/lib/number";
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
import { useNutzaps, useSentNutzaps } from "@/lib/cashu";
import { usePubkey } from "@/lib/account";
import { cn } from "@/lib/utils";

function Nutzap({
  event,
  showReceiver,
}: {
  event: NostrEvent;
  showReceiver?: boolean;
}) {
  const zap = validateNutzap(event);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [isRedeemed, setIsRedeemed] = useState(false);
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
              setIsRedeemed(true);
            },
          });
        }
      }
    } catch (err) {
      console.error(err);
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
          <NutzapContent
            event={event}
            zap={zap}
            classNames={{
              singleCustomEmoji: "h-12 w-12",
              onlyEmojis: "text-5xl",
            }}
          />
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
          {zap.p === me ? (
            <Button
              disabled={!wallet || isRedeemed}
              variant="ghost"
              onClick={redeem}
            >
              {isRedeemed ? (
                <Check />
              ) : isRedeeming ? (
                <RotateCw className="animate-spin" />
              ) : (
                <HandCoins />
              )}
              {isRedeemed ? t("nutzaps.redeemed") : t("nutzaps.redeem")}
            </Button>
          ) : null}

          <div className="flex flex-row items-center justify-between">
            <div className="">
              {zap.p2pk ? <Pubkey isCashu pubkey={zap.p2pk} /> : null}
              <MintLink
                includeLandmark
                url={zap.mint}
                classNames={{ icon: "size-3", name: "text-xs text-foreground" }}
              />
            </div>
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
      </CardFooter>
    </Card>
  );
}

function MyNutzaps({ pubkey }: { pubkey: string }) {
  const { t } = useTranslation();
  const nutzaps = useNutzaps(pubkey);
  const sentNutzaps = useSentNutzaps();
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
            <div className="flex flex-col gap-2 w-full">
              {nutzaps.length === 0 ? (
                <div className="flex items-center justify-center py-12 w-full">
                  <span className="text-xs text-muted-foreground">
                    {t("nutzaps.no-received")}
                  </span>
                </div>
              ) : null}
              {nutzaps.map((event) => (
                <Nutzap key={event.id} event={event} />
              ))}
            </div>
          </TabsContent>
          <TabsContent value="send">
            <div className="flex flex-col gap-2 w-full">
              {sentNutzaps.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <span className="text-xs text-muted-foreground">
                    {t("nutzaps.no-sent")}
                  </span>
                </div>
              ) : null}
              {sentNutzaps.map((event) => (
                <Nutzap showReceiver key={event.id} event={event} />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default function Nutzaps() {
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
        <MyNutzaps pubkey={pubkey} />
      ) : (
        <span className="text-sm text-muted-foreground">
          {t("nutzaps.log-in")}
        </span>
      )}
    </div>
  );
}

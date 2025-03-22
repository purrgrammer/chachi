import { useMemo } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Zap as ZapIcon,
  Bitcoin,
  ArrowDownRight,
  ArrowUpRight,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { NDKKind } from "@nostr-dev-kit/ndk";
import { E, A } from "@/components/nostr/event";
import { Header } from "@/components/header";
import {
  useRichText,
  RichText,
  BlockFragment,
  EmojiFragment,
} from "@/components/rich-text";
import { Emoji } from "@/components/emoji";
import { User } from "@/components/nostr/user";
import { formatShortNumber } from "@/lib/number";
import { validateZap } from "@/lib/nip-57";
import type { Zap as ZapType } from "@/lib/nip-57";
import { validateNutzap } from "@/lib/nip-61";
import type { Nutzap as NutzapType } from "@/lib/nip-61";
import { useSentZaps, useReceivedZaps } from "@/lib/zap";
import { useNutzaps, useSentNutzaps } from "@/lib/cashu";
import { usePubkey } from "@/lib/account";
import { useRelays } from "@/lib/nostr";
import { cn, dedupeBy } from "@/lib/utils";
import { HUGE_AMOUNT } from "@/lib/zap";

function ZapContent({
  zap,
  className,
  classNames,
}: {
  zap: ZapType | NutzapType;
  className?: string;
  classNames?: {
    singleCustomEmoji?: string;
    onlyEmojis?: string;
  };
}) {
  const content = zap.content.trim();
  const fragments = useRichText(
    content,
    {
      emojis: true,
    },
    zap.tags,
  );
  const { t } = useTranslation();
  const isSingleCustomEmoji =
    fragments.length === 1 &&
    fragments[0].type === "block" &&
    fragments[0].nodes.length === 1 &&
    fragments[0].nodes[0].type === "emoji";
  const singleCustomEmoji = isSingleCustomEmoji
    ? ((fragments[0] as BlockFragment).nodes[0] as EmojiFragment)
    : null;
  const isOnlyEmojis =
    /^\p{Emoji_Presentation}{1}\s*\p{Emoji_Presentation}{0,4}$/u.test(content);
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
    <span className={cn("text-7xl", classNames?.onlyEmojis)}>{content}</span>
  ) : content ? (
    <RichText className={className} tags={zap.tags}>
      {content}
    </RichText>
  ) : (
    <span className="text-xs text-muted-foreground italic">
      {t("nutzaps.no-message")}
    </span>
  );
}

function ZapTarget({ zap }: { zap: ZapType }) {
  const myRelays = useRelays();
  const e = zap.e;
  const a = zap.a;
  if (e) {
    return <E id={e} pubkey={zap.p} relays={myRelays} showReactions={false} />;
  }
  if (a && !a.startsWith(`${NDKKind.GroupMetadata}:`)) {
    return <A address={a} relays={myRelays} showReactions={false} />;
  }
  return zap.p ? (
    <User
      pubkey={zap.p}
      classNames={{ avatar: "size-6", name: "font-normal" }}
    />
  ) : null;
}

function NutzapTarget({ zap }: { zap: NutzapType }) {
  const e = zap?.tags.find((t) => t[0] === "e")?.[1];
  const a = zap?.tags.find((t) => t[0] === "a")?.[1];
  const myRelays = useRelays();

  if (e) {
    return <E id={e} pubkey={zap.p} relays={myRelays} showReactions={false} />;
  }

  if (a) {
    return <A address={a} relays={myRelays} showReactions={false} />;
  }

  return zap.p ? (
    <User
      pubkey={zap.p}
      classNames={{ avatar: "size-7", name: "font-normal" }}
    />
  ) : null;
}

function ZapItem({
  event,
  isReceive,
}: {
  event: BothZaps;
  isReceive?: boolean;
}) {
  const pubkey = usePubkey();
  const isHuge = event.zap.amount >= HUGE_AMOUNT;
  return (
    <div className="flex flex-row gap-2 items-end">
      {isReceive ? (
        <User
          pubkey={event.zap.pubkey}
          classNames={{ avatar: "size-6", name: "hidden" }}
        />
      ) : pubkey ? (
        <User
          pubkey={pubkey}
          classNames={{ avatar: "size-6", name: "hidden" }}
        />
      ) : null}
      <div className="z-0 w-full rounded-tl-lg rounded-tr-lg rounded-br-lg">
        <div
          className="relative 

	      rounded-tl-lg rounded-tr-lg rounded-br-lg
	bg-background/80 w-full"
        >
          <div className="flex flex-col gap-2 p-2 pb-1 items-start w-full">
            {event.type === "nip-61" ? (
              <NutzapTarget key={event.zap.id} zap={event.zap as NutzapType} />
            ) : (
              <ZapTarget key={event.zap.id} zap={event.zap as ZapType} />
            )}
            <div
              className={cn(
                "flex flex-row gap-2 items-center justify-between w-full",
                isHuge ? "border-animated-gradient" : "border-gradient",
                "rounded-tl-lg rounded-tr-lg rounded-br-lg",
              )}
            >
              <ZapContent
                zap={event.zap}
                className="line-clamp-1"
                classNames={{
                  singleCustomEmoji: "size-8",
                  onlyEmojis: "text-3xl",
                }}
              />
              <div className="flex flex-col gap-0">
                <div className="flex flex-row items-center gap-0">
                  <Bitcoin className="size-6 text-muted-foreground" />
                  <span className="text-2xl font-mono">
                    {formatShortNumber(event.zap.amount)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
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
    return dedupeBy(sentNutzaps, "id")
      .map((zap) => ({
        type: "nip-61" as ZapKind,
        zap: validateNutzap(zap)! as NutzapType,
      }))
      .filter((zap) => zap.zap);
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
      <div className="flex flex-col gap-2 w-full">
        {sorted.map((event) => (
          <ZapItem key={event.zap.id} event={event} />
        ))}
      </div>
    </div>
  );
}

type ZapKind = "nip-57" | "nip-61";
// fixme: proper type
type Nip57Zap = { type: ZapKind; zap: ZapType };
type Nip61Zap = { type: ZapKind; zap: NutzapType };
type BothZaps = Nip57Zap | Nip61Zap;
type AllZaps = BothZaps[];

function Received() {
  const { t } = useTranslation();
  const nutzapEvents = useNutzaps();
  const nutzaps = useMemo(() => {
    return nutzapEvents
      .map((zap) => ({
        type: "nip-61" as ZapKind,
        zap: validateZap(zap!) as NutzapType,
      }))
      .filter((zap) => zap.zap);
  }, [nutzapEvents]);
  const { events: receivedZaps } = useReceivedZaps();
  const zaps = useMemo(() => {
    return dedupeBy(receivedZaps, "id")
      .map(validateZap)
      .filter(Boolean)
      .map((zap) => ({ type: "nip-57" as ZapKind, zap: zap! as ZapType }));
  }, [receivedZaps]);

  const sorted: AllZaps = useMemo(() => {
    const s = [...zaps, ...nutzaps];
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
      {sorted.map((event) => (
        <ZapItem key={event.zap.id} event={event} isReceive />
      ))}
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

import { useMemo } from "react";
import {
  Zap as ZapIcon,
  Bitcoin,
  HandCoins,
  Landmark,
  MessagesSquare,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { NostrEvent } from "nostr-tools";
import { NDKKind } from "@nostr-dev-kit/ndk";
import { E, A } from "@/components/nostr/event";
import { RichText } from "@/components/rich-text";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { User } from "@/components/nostr/user";
import { formatRelativeTime } from "@/lib/time";
import { formatShortNumber } from "@/lib/number";
import { validateZap } from "@/lib/nip-57";
import { validateNutzap } from "@/lib/nip-61";
import { useRelays, useRequest } from "@/lib/nostr";
import { MintName, MintIcon } from "@/components/mint";
import { GroupName, GroupPicture } from "@/components/nostr/groups/metadata";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { groupURL } from "@/lib/groups";
import { useWallet } from "@/lib/wallet";
import { dedupeBy } from "@/lib/utils";
import { usePubkey } from "@/lib/account";

function Zap({ event }: { event: NostrEvent }) {
  const zap = validateZap(event);
  const { t } = useTranslation();
  return zap ? (
    <Card>
      <CardHeader>
        <div className="flex flex-row items-center justify-between">
          <CardTitle>
            <User
              pubkey={zap.pubkey}
              classNames={{ avatar: "size-6", name: "font-normal" }}
            />
          </CardTitle>
          <span className="text-sm font-light text-muted-foreground">
            {formatRelativeTime(zap.created_at)}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3 items-center justify-center">
          <div className="flex flex-row items-center gap-1">
            <Bitcoin className="size-12 text-muted-foreground" />
            <span className="font-mono text-6xl">
              {formatShortNumber(zap.amount)}
            </span>
          </div>
          <RichText tags={event.tags.concat(zap.tags)}>{zap.content}</RichText>
          {zap.e ? (
            <E id={zap.e} pubkey={zap.p} />
          ) : zap.a ? (
            <A address={zap.a} />
          ) : null}
        </div>
      </CardContent>
    </Card>
  ) : (
    <span className="text-xs text-muted-foreground">
      {t("nutzaps.invalid")}
    </span>
  );
}

function Nutzap({ event }: { event: NostrEvent }) {
  const zap = validateNutzap(event);
  const wallet = useWallet();
  const { t } = useTranslation();
  const id = event.tags.find((t) => t[0] === "h")?.[1];
  const relay = event.tags.find((t) => t[0] === "h")?.[2];
  const group = id && relay ? { id, relay } : undefined;
  // todo: redeem to wallet
  return zap ? (
    <Card>
      <CardHeader>
        <div className="flex flex-row items-center justify-between">
          <CardTitle>
            <User
              pubkey={zap.pubkey}
              classNames={{ avatar: "size-6", name: "font-normal" }}
            />
          </CardTitle>
          <div className="flex flex-row gap-2 items-center">
            {group ? (
              <Link
                to={groupURL(group)}
                className="text-sm hover:cursor-pointer hover:underline hover:decoration-dotted"
              >
                <div className="flex flex-row items-center gap-1.5">
                  <MessagesSquare className="size-4 text-muted-foreground" />
                  <div className="flex flex-row items-center gap-1">
                    <GroupPicture group={group} className="size-4" />
                    <GroupName group={group} />
                  </div>
                </div>
              </Link>
            ) : null}
            <span className="text-sm font-light text-muted-foreground">
              {formatRelativeTime(zap.created_at)}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3 items-center justify-center">
          <div className="flex flex-col items-center gap-0.5">
            <div className="flex flex-row items-center gap-1">
              <Bitcoin className="size-12 text-muted-foreground" />
              <span className="font-mono text-6xl">
                {formatShortNumber(zap.amount)}
              </span>
            </div>
            <div className="flex flex-row gap-1 items-center">
              <Landmark className="size-4 text-muted-foreground" />
              <MintIcon url={zap.mint} className="size-4" />
              <MintName url={zap.mint} className="text-xs" />
            </div>
          </div>
          <RichText tags={event.tags.concat(zap.tags)}>{zap.content}</RichText>
          {zap.e ? (
            <E id={zap.e} pubkey={zap.p} />
          ) : zap.a ? (
            <A address={zap.a} />
          ) : null}
        </div>
      </CardContent>
      {wallet ? (
        <CardFooter>
          <Button disabled={true} className="w-full">
            <HandCoins />
            {t("nutzaps.redeem")}
          </Button>
        </CardFooter>
      ) : null}
    </Card>
  ) : (
    <span className="text-xs text-muted-foreground">
      {t("nutzaps.invalid")}
    </span>
  );
}

function MyNutzaps({ pubkey }: { pubkey: string }) {
  const relays = useRelays();
  const filter = {
    kinds: [NDKKind.Nutzap, NDKKind.Zap],
    "#p": [pubkey],
    limit: 100,
  };
  const { events } = useRequest(filter, relays);
  const sorted = useMemo(() => {
    const s = dedupeBy(events, "id");
    s.sort((a, b) => b.created_at - a.created_at);
    return s;
  }, [events]);
  return (
    <div className="flex items-center justify-center p-2">
      <div className="w-[calc(100vw-2rem)] sm:w-[420px] md:w-[510px]">
        <div className="flex flex-col gap-1">
          {sorted.map((event) =>
            event.kind === NDKKind.Nutzap ? (
              <Nutzap key={event.id} event={event} />
            ) : (
              <Zap key={event.id} event={event} />
            ),
          )}
        </div>
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

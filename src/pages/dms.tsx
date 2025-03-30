import {
  useUnreadMessages,
  useSortedGroups,
  useDirectMessages,
} from "@/lib/nostr/dm";
import { Link } from "react-router-dom";
import { RelayIcon } from "@/components/nostr/relay";
import { useDMRelays, usePubkey } from "@/lib/account";
import { Server, Lock, Activity } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/header";
import { useRelayInfo } from "@/lib/relay";
import { PrivateGroup } from "@/lib/types";
import { Reorder } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Avatar } from "@/components/nostr/avatar";
import { Name } from "@/components/nostr/name";
import { NameList } from "@/components/nostr/name-list";
import { WebRTC } from "@/components/webrtc";

function Heading({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex flex-row gap-1 items-center">
      {icon}
      <h3 className="text-sm font-light uppercase">{text}</h3>
    </div>
  );
}

// Activity

function GroupMessages({ group }: { group: PrivateGroup }) {
  const unread = useUnreadMessages(group);
  const { t } = useTranslation();
  const isSingle = group.pubkeys.length === 1;
  const me = usePubkey();
  const firstPubkey = group.pubkeys.filter((p) => p !== me)[0];
  const navigate = useNavigate();
  return unread && unread > 0 ? (
    <Reorder.Item dragListener={false} key={group.id} value={group}>
      <Button
        variant="ghost"
        className="relative h-fit min-w-32 w-fit"
        onClick={() => navigate(`/dm/${group.id}`)}
      >
        <div className="flex flex-col gap-1 items-center">
          {isSingle ? (
            <Avatar
              pubkey={firstPubkey ? firstPubkey : group.pubkeys[0]}
              className="size-10"
            />
          ) : null}
          <h3 className="text-lg">
            {isSingle ? (
              <Name pubkey={firstPubkey ? firstPubkey : group.pubkeys[0]} />
            ) : (
              <NameList pubkeys={group.pubkeys} />
            )}
          </h3>
          <div className="flex flex-col gap-1 items-center text-xs">
            <div
              className={`flex flex-row gap-1 ${unread === 0 ? "opacity-50" : ""}`}
            >
              <span className="font-mono">
                {unread >= 100 ? "99+" : unread}
              </span>
              <span className="text-muted-foreground">
                {t("dashboard.activity.unread")}
              </span>
            </div>
          </div>
        </div>
      </Button>
    </Reorder.Item>
  ) : null;
}

function GroupActivityList() {
  const sortedGroups = useSortedGroups();
  return (
    <Reorder.Group
      axis="x"
      className="flex overflow-x-auto flex-row gap-1 items-center px-0 no-scrollbar w-[calc(100vw-1.5rem)] md:w-[calc(100vw-20rem)]"
      values={sortedGroups}
      onReorder={() => console.log("reorder")}
    >
      {sortedGroups.map((group) => (
        <GroupMessages key={group.id} group={group} />
      ))}
    </Reorder.Group>
  );
}

function GroupsActivity() {
  const { t } = useTranslation();
  return (
    <div className="space-y-2">
      <Heading
        icon={<Activity className="size-4" />}
        text={t("dashboard.activity.heading")}
      />
      <GroupActivityList />
    </div>
  );
}

function RelayItem({ relay }: { relay: string }) {
  const { data: info } = useRelayInfo(relay);
  const supportsAuth = info?.supported_nips?.includes(42);
  const { t } = useTranslation();
  return (
    <Link to={`/relay/${encodeURIComponent(relay)}`}>
      <div className="w-64 flex flex-col gap-0 items-center rounded-md bg-background/80 border">
        <RelayIcon
          relay={relay}
          className="w-full h-32 object-fit rounded-none rounded-tl-md rounded-tr-md"
        />
        <div className="flex flex-row gap-2 items-center p-2">
          <div className="flex flex-col gap-2">
            <div className="flex flex-row gap-2 items-center">
              <h3 className="text-lg">{info?.name}</h3>
              {supportsAuth ? (
                <Badge variant="secondary">
                  <div className="flex flex-row gap-1 items-center">
                    <Lock className="size-4" />
                    {t("private-group.auth")}
                  </div>
                </Badge>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground line-clamp-3">
              {info?.description}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}
export default function DirectMessages() {
  useDirectMessages();
  const dmRelays = useDMRelays();
  const hasNoDMRelays = dmRelays.dm.length === 0;
  const { t } = useTranslation();
  return (
    <div className="flex flex-col">
      <Header>
        <h2 className="text-lg">{t("private-group.private-groups")}</h2>
      </Header>
      <div className="flex flex-col p-2 px-4 space-y-4">
        <WebRTC />
        <GroupsActivity />
        {hasNoDMRelays ? (
          <p className="text-lg font-bold">{t("private-group.no-dm-relays")}</p>
        ) : (
          <div className="flex flex-col gap-2">
            <Heading
              icon={<Server className="size-4" />}
              text={t("private-group.dm-relays")}
            />
            <div className="flex flex-row gap-2">
              {dmRelays.dm.map((relay) => (
                <RelayItem key={relay} relay={relay} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import { useMemo, useState } from "react";
import {
  MapPin,
  Calendar,
  Check,
  MailPlus,
  MailMinus,
  MailQuestion,
} from "lucide-react";
import { NostrEvent } from "nostr-tools";
import { RichText } from "@/components/rich-text";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/time";
//import { MiniMap } from "@/components/map-minimap";
import type { Group } from "@/lib/types";
import { useReactions } from "@/lib/nostr";
import { NDKEvent, NDKRelaySet } from "@nostr-dev-kit/ndk";
import { RSVP } from "@/lib/kinds";
import { NameList } from "./name-list";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { usePubkey } from "@/lib/account";
import { useNDK } from "@/lib/ndk";

export function CalendarEvent({
  event,
  group,
  className,
}: {
  event: NostrEvent;
  group?: Group;
  className?: string;
}) {
  const ndk = useNDK();
  const [isPublishing, setIsPublishing] = useState(false);
  const pubkey = usePubkey();
  const { t } = useTranslation();
  const title = event.tags.find((tag) => tag[0] === "title")?.[1];
  const summary =
    event.content || event.tags.find((tag) => tag[0] === "description")?.[1];
  const image = event.tags.find((tag) => tag[0] === "image")?.[1];
  const startDate = event.tags.find((tag) => tag[0] === "start")?.[1];
  const endDate = event.tags.find((tag) => tag[0] === "end")?.[1];
  const isExpired = endDate
    ? Number(endDate) < Date.now()
    : startDate
      ? Number(startDate) < Date.now()
      : false;
  const tz = event.tags.find((tag) => tag[0] === "start_tzid")?.[1];
  const location = event.tags.find((tag) => tag[0] === "location")?.[1];
  const { events } = useReactions(event, [RSVP], group ? [group.relay] : []);
  const rsvps = useMemo(() => {
    const statuses = events.reverse().reduce(
      (acc, ev) => {
        const status = ev.tags.find((t) => t[0] === "status")?.[1];
        if (status && ["accepted", "tentative", "declined"].includes(status)) {
          acc[ev.pubkey] = status as "accepted" | "tentative" | "declined";
        }
        return acc;
      },
      {} as Record<string, "accepted" | "tentative" | "declined">,
    );
    return Object.entries(
      Object.groupBy(Object.entries(statuses), (r) => r[1]),
    ).map(([status, rsvps]) => {
      return {
        status,
        pubkeys: rsvps.map((r) => r[0]),
      };
    });
  }, [events]);
  const accepted = rsvps.find((s) => s.status === "accepted");
  const tentative = rsvps.find((s) => s.status === "tentative");
  const declined = rsvps.find((s) => s.status === "declined");
  //const geohash = event.tags.find((tag) => tag[0] === "g")?.[1];
  const iAccepted = pubkey && accepted?.pubkeys.includes(pubkey);
  const iTentative = pubkey && tentative?.pubkeys.includes(pubkey);
  const iDeclined = pubkey && declined?.pubkeys.includes(pubkey);
  const myRsvp = useMemo(() => {
    if (pubkey) {
      return events.reduce(
        (acc, ev) => {
          if (ev.pubkey === pubkey) {
            return ev;
          }
          return acc;
        },
        null as NostrEvent | null,
      );
    }
    return null;
  }, [events, pubkey]);

  async function handleRSVP(status: "accepted" | "tentative" | "declined") {
    try {
      setIsPublishing(true);
      // todo: did we rsvp already?
      const d = myRsvp?.tags.find((t) => t[0] === "d")?.[1];
      const relaySet = NDKRelaySet.fromRelayUrls(
        group ? [group.relay] : [],
        ndk,
      );
      const ev = new NDKEvent(ndk, {
        kind: RSVP,
        content: "",
        tags: [...(d ? [["d", d]] : []), ["status", status]],
      } as NostrEvent);
      ev.tag(new NDKEvent(ndk, event));
      await ev.publish(relaySet);
      console.log("RSVP", d, ev);
    } catch (err) {
      console.error(err);
    } finally {
      setIsPublishing(false);
    }
  }

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {image ? (
        <img
          src={image}
          className="w-full aspect-auto max-h-[210px] object-cover"
        />
      ) : null}

      <div className="flex flex-col gap-2">
        <h3 className="text-lg">{title}</h3>
        <ul className="flex flex-col gap-1 ml-3">
          {startDate && (
            <li className="flex flex-row gap-2 items-center">
              <Calendar className="size-5 text-muted-foreground" />{" "}
              <span className="text-sm">
                {formatDateTime(Number(startDate), tz)}
              </span>
            </li>
          )}
          {location && (
            <li className="flex flex-row gap-2 items-center">
              <MapPin className="size-5 text-muted-foreground" />{" "}
              <a
                className="text-sm underline decoration-dotted line-clamp-1"
                href={`https://www.google.com/maps/search/?api=1&query=${location}`}
                target="_blank"
                rel="noreferrer"
              >
                {location}
              </a>
            </li>
          )}
        </ul>
        {summary ? (
          <RichText className="text-sm" tags={event.tags} group={group}>
            {summary}
          </RichText>
        ) : null}

        {accepted ? (
          <NameList pubkeys={accepted.pubkeys} suffix={t("rsvp.going")} />
        ) : null}

        {!isExpired ? (
          <div className="flex flex-row items-center justify-between">
            <span className="text-lg text-muted-foreground">
              {t("rsvp.rsvp")}
            </span>
            <div className="flex gap-2 pt-2">
              <Button
                variant="default"
                size="sm"
                aria-label={t("rsvp.yes")}
                onClick={() => handleRSVP("accepted")}
                disabled={isPublishing}
              >
                {iAccepted ? <Check /> : <MailPlus />}
                {t("rsvp.yes")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                aria-label={t("rsvp.maybe")}
                onClick={() => handleRSVP("tentative")}
                disabled={isPublishing}
              >
                {iTentative ? <Check /> : <MailQuestion />}
                {t("rsvp.maybe")}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                aria-label={t("rsvp.no")}
                onClick={() => handleRSVP("declined")}
                disabled={isPublishing}
              >
                {iDeclined ? <Check /> : <MailMinus />}
                {t("rsvp.no")}
              </Button>
            </div>
          </div>
        ) : null}

        {/*
        {geohash && (
          <div className="mt-2">
            <MiniMap geohash={geohash} height="120px" />
          </div>
        )}
	*/}
      </div>
    </div>
  );
}

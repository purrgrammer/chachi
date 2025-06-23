import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  MapPin,
  CalendarDays,
  Calendar as CalendarIcon,
  Clock4,
  Check,
  MailPlus,
  MailMinus,
  MailQuestion,
} from "lucide-react";
import { nip19, NostrEvent } from "nostr-tools";
import { RichText } from "@/components/rich-text";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/time";
//import { MiniMap } from "@/components/map-minimap";
import type { Group } from "@/lib/types";
import { useReactions, useRelayList, useARef, useARefs } from "@/lib/nostr";
import { NDKEvent, NDKRelaySet } from "@nostr-dev-kit/ndk";
import { RSVP } from "@/lib/kinds";
import { NameList } from "./name-list";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { usePubkey } from "@/lib/account";
import { useNDK } from "@/lib/ndk";
import { CALENDAR, CALENDAR_EVENT } from "@/lib/kinds";

function CalendarLink({ aRef }: { aRef: string }) {
  const { t } = useTranslation();
  const { data: event } = useARef(["a", aRef]);
  if (!event) return null;
  const name =
    event.tags.find((tag) => tag[0] === "name")?.[1] ||
    event.tags.find((tag) => tag[0] === "d")?.[1] ||
    t("calendar.calendar", "Calendar");
  return (
    <Link
      to={`/e/${nip19.naddrEncode({
        kind: CALENDAR,
        identifier: event.tags.find((tag) => tag[0] === "d")?.[1] || "",
        pubkey: event.pubkey,
      })}`}
      className="underline decoration-dotted line-clamp-1"
    >
      <div className="flex flex-row gap-2 items-center">
        <CalendarDays className="size-5 text-muted-foreground" />
        <span className="text-sm">{name}</span>
      </div>
    </Link>
  );
}

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
  const calendarRef = event.tags.find((t) => t[0] === "calendar")?.[1];
  const summary =
    event.content || event.tags.find((tag) => tag[0] === "description")?.[1];
  const image = event.tags.find((tag) => tag[0] === "image")?.[1];
  const startDate = event.tags.find((tag) => tag[0] === "start")?.[1];
  const endDate = event.tags.find((tag) => tag[0] === "end")?.[1];
  const isExpired = startDate
    ? Number(startDate) * 1000 < Date.now()
    : endDate
      ? Number(endDate) * 1000 < Date.now()
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
              <Clock4 className="size-5 text-muted-foreground" />{" "}
              <span className="text-sm">
                {formatDateTime(Number(startDate), tz)}
              </span>
            </li>
          )}
          {location && (
            <li className="flex flex-row gap-2 items-center">
              <MapPin className="size-5 flex-shrink-0 text-muted-foreground" />
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
          {calendarRef ? (
            <li>
              <CalendarLink aRef={calendarRef} />
            </li>
          ) : null}
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

function CalendarEventList({
  event,
  relays,
}: {
  event: NostrEvent;
  relays: string[];
}) {
  const { t } = useTranslation();
  const aRefs = event.tags
    .filter((tag) => tag[0] === "a" && tag[1]?.startsWith(`${CALENDAR_EVENT}:`))
    .map((tag) => tag[1]);
  const { events } = useARefs(aRefs, relays);

  const { upcomingEvents, pastEvents } = useMemo(() => {
    if (!events || events.length === 0) {
      return { upcomingEvents: [], pastEvents: [] };
    }

    const now = Date.now();
    const upcoming: NostrEvent[] = [];
    const past: NostrEvent[] = [];

    events.forEach((event) => {
      const startDate = event.tags.find((tag) => tag[0] === "start")?.[1];
      const endDate = event.tags.find((tag) => tag[0] === "end")?.[1];

      // Determine if event is past or upcoming
      let isPast = false;
      if (endDate) {
        // If end date exists, use it to determine if event is past
        isPast = Number(endDate) * 1000 < now;
      } else if (startDate) {
        // If only start date exists, use it
        isPast = Number(startDate) * 1000 < now;
      }

      if (isPast) {
        past.push(event);
      } else {
        upcoming.push(event);
      }
    });

    // Sort upcoming events by start date (earliest first)
    upcoming.sort((a, b) => {
      const aStart = a.tags.find((tag) => tag[0] === "start")?.[1];
      const bStart = b.tags.find((tag) => tag[0] === "start")?.[1];
      if (!aStart || !bStart) return 0;
      return Number(aStart) - Number(bStart);
    });

    // Sort past events by start date (most recent first)
    past.sort((a, b) => {
      const aStart = a.tags.find((tag) => tag[0] === "start")?.[1];
      const bStart = b.tags.find((tag) => tag[0] === "start")?.[1];
      if (!aStart || !bStart) return 0;
      return Number(bStart) - Number(aStart);
    });

    return { upcomingEvents: upcoming, pastEvents: past };
  }, [events]);

  const renderEventItem = (event: NostrEvent) => {
    const title =
      event.tags.find((tag) => tag[0] === "name")?.[1] ||
      event.tags.find((tag) => tag[0] === "title")?.[1] ||
      t("calendar.untitled-event", "Untitled Event");
    const startDate = event.tags.find((tag) => tag[0] === "start")?.[1];
    const tz = event.tags.find((tag) => tag[0] === "start_tzid")?.[1];
    const eventUrl = `/e/${nip19.neventEncode({
      id: event.id,
      kind: CALENDAR_EVENT,
      author: event.pubkey,
    })}`;

    return (
      <Link
        key={event.id}
        to={eventUrl}
        className="flex flex-col gap-1 rounded"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarIcon className="size-4 text-muted-foreground flex-shrink-0" />
            <h4 className="font-medium text-sm line-clamp-1 underline decoration-dotted">
              {title}
            </h4>
          </div>
          {startDate && (
            <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
              {formatDateTime(Number(startDate), tz)}
            </span>
          )}
        </div>
      </Link>
    );
  };

  if (!events || events.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4">
      {upcomingEvents.length > 0 && (
        <div>
          <h3 className="font-light text-md my-2 flex items-center gap-2">
            <CalendarDays className="size-5 text-muted-foreground" />
            {t("calendar.upcoming-events", "Upcoming Events")}
          </h3>
          <ol className="flex flex-col gap-2 px-2">
            {upcomingEvents.map(renderEventItem)}
          </ol>
        </div>
      )}

      {pastEvents.length > 0 && (
        <div>
          <h3 className="font-light text-md my-2 flex items-center gap-2">
            <Clock4 className="size-5 text-muted-foreground" />
            {t("calendar.past-events", "Past Events")}
          </h3>
          <ol className="flex flex-col gap-2 px-2">
            {pastEvents.map(renderEventItem)}
          </ol>
        </div>
      )}
    </div>
  );
}

export function Calendar({
  event,
  group,
  className,
}: {
  event: NostrEvent;
  group?: Group;
  className?: string;
}) {
  const title =
    event.tags.find((tag) => tag[0] === "name")?.[1] ||
    event.tags.find((tag) => tag[0] === "title")?.[1];
  const summary =
    event.content || event.tags.find((tag) => tag[0] === "description")?.[1];
  const image = event.tags.find((tag) => tag[0] === "image")?.[1];
  const { data: relays } = useRelayList(event.pubkey);

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {image ? (
        <img
          src={image}
          className="w-full aspect-auto max-h-[210px] object-cover"
        />
      ) : null}

      <div className="flex flex-col gap-2">
        <div className="flex flex-row gap-2 items-center">
          <CalendarDays className="size-5 text-muted-foreground" />{" "}
          <h3 className="text-lg">{title}</h3>
        </div>
        {summary ? (
          <RichText className="text-sm" tags={event.tags} group={group}>
            {summary}
          </RichText>
        ) : null}
      </div>
      {relays ? <CalendarEventList event={event} relays={relays} /> : null}
    </div>
  );
}

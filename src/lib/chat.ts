import { NostrEvent } from "nostr-tools";
import i18n from "i18next";
import { getLanguage } from "@/i18n";

export interface GroupedByDay {
  day: string;
  messages: NostrEvent[];
}

export function groupByDay(events: NostrEvent[]): GroupedByDay[] {
  return events.reduce((acc, event) => {
    const date = new Date(event.created_at * 1000);
    const day = `${date.getMonth()}/${date.getDate()}/${date.getFullYear()}`;
    const lastGroup = acc[acc.length - 1] || {};
    if (lastGroup.day === day) {
      lastGroup.messages.unshift(event);
    } else {
      acc.push({ day, messages: [event] });
    }
    return acc;
  }, [] as GroupedByDay[]);
}

export function formatDay(date: string) {
  const currentYear = new Date().getFullYear();
  const [month, day, year] = date.split("/");
  const today = new Date();
  if (
    today.getMonth() === Number(month) &&
    today.getDate() === Number(day) &&
    today.getFullYear() === Number(year)
  ) {
    return i18n.t("locale.today");
  }
  return Intl.DateTimeFormat(getLanguage(), {
    day: "numeric",
    month: "long",
    year: currentYear === Number(year) ? undefined : "numeric",
  }).format(new Date(Number(year), Number(month), Number(day)));
}

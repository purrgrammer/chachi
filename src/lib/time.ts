import { getLanguage } from "@/i18n";

export function formatDay(date: Date) {
  return new Intl.DateTimeFormat(getLanguage(), {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
}

export function formatRelativeTime(timestamp: number) {
  const now = Math.floor(Date.now() / 1000);
  const elapsed = now - timestamp;

  if (elapsed < 60) {
    return `Just now`;
  } else if (elapsed < 3600) {
    const minutes = Math.floor(elapsed / 60);
    return `${minutes}m`;
  } else if (elapsed < 86400) {
    const hours = Math.floor(elapsed / 3600);
    return `${hours}h`;
  } else if (elapsed < 604800) {
    const days = Math.floor(elapsed / 86400);
    return `${days}d`;
  } else {
    return Intl.DateTimeFormat(getLanguage(), {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(timestamp * 1000));
  }
}

export function formatTime(timestamp: number) {
  return Intl.DateTimeFormat(getLanguage(), {
    timeStyle: "short",
  }).format(new Date(timestamp * 1000));
}

function convertTZ(date: Date | string, timeZone: string) {
  return new Date(
    (typeof date === "string" ? new Date(date) : date).toLocaleString("en-US", {
      timeZone,
    }),
  );
}

export function formatDateTime(timestamp: number, tz?: string) {
  let date = new Date(timestamp * 1000);
  if (tz) {
    date = convertTZ(date, tz);
  }
  return Intl.DateTimeFormat(getLanguage(), {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

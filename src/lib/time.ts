// todo: locale

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
    return Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(timestamp * 1000));
  }
}

export function formatTime(timestamp: number) {
  return Intl.DateTimeFormat("en-US", {
    timeStyle: "short",
  }).format(new Date(timestamp * 1000));
}

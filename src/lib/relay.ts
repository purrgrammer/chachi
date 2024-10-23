"use client";

import { useQuery } from "@tanstack/react-query";

export const nip29Relays = [
  "wss://groups.0xchat.com",
  "wss://relay.groups.nip29.com",
];

const relayUrlRegex =
  /((?:ws|wss?):\/?\/?(?:[\w+?.\w+])+(?:[\p{L}\p{N}~!@#$%^&*()_\-=+\\/?.:;',]*)?(?:[-a-z0-9+&@#/%=~()_|]))/iu;

export function isRelayURL(content: string) {
  return relayUrlRegex.test(content);
}

function fetchRelayInfo(url: string) {
  const httpUrl = url.replace("wss://", "https://");
  return fetch(httpUrl, {
    headers: {
      Accept: "application/nostr+json",
    },
  })
    .then((res) => res.json())
    .then((info) => {
      if (!info.icon) {
        info.icon = `${httpUrl}/favicon.ico`;
      }
      return info;
    });
}

// todo: cache these in localStorage
export function useRelayInfo(url: string) {
  return useQuery({
    queryKey: ["relay-info", url],
    queryFn: () => fetchRelayInfo(url),
    staleTime: Infinity,
  });
}

export function normalizeRelayURL(url: string) {
  return url.replace("wss://", "").replace(/\/?$/, "");
}

export function getRelayHost(url: string) {
  return url.replace("wss://", "").replace(/\/?$/, "");
}

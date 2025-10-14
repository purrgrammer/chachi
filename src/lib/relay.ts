import { useQuery } from "@tanstack/react-query";

// NIP-11: https://github.com/nostr-protocol/nips/blob/master/11.md
export interface RelayLimitation {
  max_message_length?: number;
  max_subscriptions?: number;
  max_filters?: number;
  max_limit?: number;
  max_subid_length?: number;
  max_event_tags?: number;
  max_content_length?: number;
  min_pow_difficulty?: number;
  auth_required?: boolean;
  payment_required?: boolean;
  restricted_writes?: boolean;
  created_at_lower_limit?: number;
  created_at_upper_limit?: number;
}

export interface RetentionPolicy {
  kinds?: (number | [number, number])[];
  time?: number;
  count?: number;
}

export interface Fee {
  amount: number;
  unit: string;
  period?: number;
}

export interface RelayFees {
  admission?: Fee[];
  subscription?: Fee[];
  publication?: Array<Fee & { kinds?: number[] }>;
}

export interface RelayInfo {
  name?: string;
  description?: string;
  banner?: string;
  icon?: string;
  pubkey?: string;
  contact?: string;
  supported_nips?: number[];
  software?: string;
  version?: string;
  limitation?: RelayLimitation;
  retention?: RetentionPolicy[];
  relay_countries?: string[];
  language_tags?: string[];
  tags?: string[];
  posting_policy?: string;
  payments_url?: string;
  fees?: RelayFees;
}

export const discoveryRelays = [
  "wss://purplepag.es",
  "wss://relay.nostr.band",
  "wss://profiles.nostrver.se",
  //"wss://profiles.nostr1.com",
];

export const fallbackRelays = ["wss://relay.nostr.band"];

export const nip29Relays = [
  "wss://groups.0xchat.com",
  "wss://groups.fiatjaf.com",
  "wss://relay.groups.nip29.com",
  "wss://relay29.notoshi.win",
  "wss://communities.nos.social",
  "wss://community.bitcointxoko.com",
  "wss://groups.hzrd149.com",
];

const relayUrlRegex =
  /^((?:ws|wss?):\/?\/?(?:[\w+?.\w+])+(?:[\p{L}\p{N}~!@#$%^&*()_\-=+\\/?.:;',]*)?(?:[-a-z0-9+&@#/%=~()_|]))$/iu;

export function isRelayURL(content: string) {
  return relayUrlRegex.test(content);
}

export function fetchRelayInfo(url: string): Promise<RelayInfo> {
  const httpUrl = url.replace("wss://", "https://");
  return fetch(httpUrl, {
    headers: {
      Accept: "application/nostr+json",
    },
  }).then((res) => res.json());
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

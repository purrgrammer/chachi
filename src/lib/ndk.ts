import { createContext, useContext } from "react";
import NDK, { NDKRelayAuthPolicies } from "@nostr-dev-kit/ndk";
import { cache } from "@/lib/db";

export const outboxRelayUrls = ["wss://purplepag.es"];

const ndk = new NDK({
  explicitRelayUrls: [
    "wss://purplepag.es",
    "wss://groups.0xchat.com",
    "wss://relay.groups.nip29.com",
    "wss://groups.fiatjaf.com",
  ],
  outboxRelayUrls,
  enableOutboxModel: false,
  cacheAdapter: cache,
});
ndk.relayAuthDefaultPolicy = NDKRelayAuthPolicies.signIn({ ndk });

export function useNDK() {
  return useContext(NDKContext);
}

export const NDKContext = createContext<NDK>(ndk);

export default ndk;

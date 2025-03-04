import { createContext, useContext } from "react";
import NDK, { NDKRelayAuthPolicies } from "@nostr-dev-kit/ndk";
import { cache } from "@/lib/db";

export const outboxRelayUrls = ["wss://purplepag.es"];

const ndk = new NDK({
  explicitRelayUrls: ["wss://purplepag.es"],
  outboxRelayUrls,
  enableOutboxModel: false,
  cacheAdapter: cache,
});
ndk.relayAuthDefaultPolicy = NDKRelayAuthPolicies.signIn({ ndk });

export const nwcNdk = new NDK({
  explicitRelayUrls: [],
  enableOutboxModel: false,
});

export function useNDK() {
  return useContext(NDKContext);
}

export function useNWCNDK() {
  return useContext(NDKNWCContext);
}

export const NDKContext = createContext<NDK>(ndk);
export const NDKNWCContext = createContext<NDK>(nwcNdk);

export default ndk;

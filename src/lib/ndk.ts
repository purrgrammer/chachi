import { createContext, useContext } from "react";
import NDK, { NDKRelayAuthPolicies } from "@nostr-dev-kit/ndk";
import { cache } from "@/lib/db";
import { bootstrapRelays, discoveryRelays } from "@/lib/relay";

const ndk = new NDK({
  explicitRelayUrls: bootstrapRelays,
  outboxRelayUrls: discoveryRelays,
  enableOutboxModel: false,
  cacheAdapter: cache,
  initialValidationRatio: 0.0,
  lowestValidationRatio: 0.0,
});
ndk.relayAuthDefaultPolicy = NDKRelayAuthPolicies.signIn({ ndk });

export function useNDK() {
  return useContext(NDKContext);
}

export const NDKContext = createContext<NDK>(ndk);

export default ndk;

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

export const nwcNdk = new NDK({
  explicitRelayUrls: [],
  enableOutboxModel: false,
  initialValidationRatio: 0.0,
  lowestValidationRatio: 0.0,
});

export function useNDK() {
  const { main } = useContext(NDKContext);
  return main;
}

export function useNWCNDK() {
  const { nwc } = useContext(NDKContext);
  return nwc;
}

export const NDKContext = createContext<{ main: NDK; nwc: NDK }>({
  main: ndk,
  nwc: nwcNdk,
});

export default ndk;

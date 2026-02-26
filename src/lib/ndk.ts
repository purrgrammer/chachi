import { createContext, useContext } from "react";
import NDK from "@nostr-dev-kit/ndk";
import { cache } from "@/lib/db";
import { discoveryRelays } from "@/lib/relay";
import { createNDKAuthManager } from "@/lib/ndk-auth-adapter";

export const ndk = new NDK({
  explicitRelayUrls: discoveryRelays,
  outboxRelayUrls: discoveryRelays,
  enableOutboxModel: false,
  cacheAdapter: cache,
  initialValidationRatio: 0.0,
  lowestValidationRatio: 0.0,
});

// Auth manager handles NIP-42 challenges with user preferences
// instead of blindly signing in to every relay
export const { authManager, signer$: authSigner$ } =
  createNDKAuthManager(ndk);

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

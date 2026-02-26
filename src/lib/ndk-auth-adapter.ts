import NDK, { NDKRelay, NDKRelayStatus, NDKEvent, NDKKind } from "@nostr-dev-kit/ndk";
import { BehaviorSubject, Subject, type Observable } from "rxjs";
import {
  RelayAuthManager,
  type AuthRelay,
  type AuthRelayPool,
  type AuthSigner,
  type PendingAuthChallenge,
} from "./relay-auth-manager";

/**
 * Wraps an NDKRelay to implement the AuthRelay interface expected by RelayAuthManager.
 * Bridges NDK's EventEmitter events to RxJS Observables.
 */
class NDKRelayAdapter implements AuthRelay {
  readonly url: string;
  readonly connected$: BehaviorSubject<boolean>;
  readonly challenge$: BehaviorSubject<string | null>;
  readonly authenticated$: BehaviorSubject<boolean>;

  private ndkRelay: NDKRelay;
  private ndk: NDK;

  constructor(ndkRelay: NDKRelay, ndk: NDK) {
    this.ndkRelay = ndkRelay;
    this.ndk = ndk;
    this.url = ndkRelay.url;

    // Initialize with current state
    this.connected$ = new BehaviorSubject<boolean>(
      ndkRelay.connectivity?.status === NDKRelayStatus.CONNECTED ||
        ndkRelay.connectivity?.status === NDKRelayStatus.AUTHENTICATED,
    );
    this.challenge$ = new BehaviorSubject<string | null>(null);
    this.authenticated$ = new BehaviorSubject<boolean>(
      ndkRelay.connectivity?.status === NDKRelayStatus.AUTHENTICATED,
    );

    // Bridge NDK events to Observables
    ndkRelay.on("connect", () => {
      this.connected$.next(true);
    });

    ndkRelay.on("disconnect", () => {
      this.connected$.next(false);
      this.authenticated$.next(false);
      this.challenge$.next(null);
    });

    ndkRelay.on("authed", () => {
      this.authenticated$.next(true);
    });
  }

  get connected(): boolean {
    return this.connected$.value;
  }

  get authenticated(): boolean {
    return this.authenticated$.value;
  }

  get challenge(): string | null {
    return this.challenge$.value;
  }

  /**
   * Called by relay-auth-manager when it decides to authenticate.
   * Creates and sends a kind 22242 AUTH event to the relay.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async authenticate(_signer: AuthSigner): Promise<void> {
    const challenge = this.challenge$.value;
    if (!challenge) throw new Error(`No challenge for ${this.url}`);

    const event = new NDKEvent(this.ndk);
    event.kind = NDKKind.ClientAuth;
    event.tags = [
      ["relay", this.url],
      ["challenge", challenge],
    ];
    await event.sign();

    // Send the AUTH event via the relay's websocket
    const ws = (this.ndkRelay.connectivity as unknown as { ws: WebSocket | null })?.ws;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(`["AUTH",${JSON.stringify(event.rawEvent())}]`);
    } else {
      throw new Error(`Cannot send AUTH to ${this.url}: not connected`);
    }
  }

  /**
   * Notify adapter of a new challenge from NDK's auth flow.
   */
  receiveChallenge(challenge: string): void {
    this.challenge$.next(challenge);
  }
}

/**
 * Wraps NDK's pool to implement AuthRelayPool interface.
 */
class NDKPoolAdapter implements AuthRelayPool {
  readonly add$: Subject<AuthRelay> = new Subject();
  readonly remove$: Subject<AuthRelay> = new Subject();

  private adapters = new Map<string, NDKRelayAdapter>();
  private ndk: NDK;

  constructor(ndk: NDK) {
    this.ndk = ndk;

    // Listen for relay connect/disconnect at pool level
    ndk.pool.on("relay:connect", (ndkRelay: NDKRelay) => {
      const adapter = this.getOrCreateAdapter(ndkRelay);
      this.add$.next(adapter);
    });

    ndk.pool.on("relay:disconnect", () => {
      // Don't remove — relay-auth-manager handles disconnect via connected$
    });
  }

  relay(url: string): AuthRelay {
    const existing = this.adapters.get(url);
    if (existing) return existing;

    const ndkRelay = this.ndk.pool.getRelay(url, false);
    return this.getOrCreateAdapter(ndkRelay);
  }

  getOrCreateAdapter(ndkRelay: NDKRelay): NDKRelayAdapter {
    const url = ndkRelay.url;
    let adapter = this.adapters.get(url);
    if (!adapter) {
      adapter = new NDKRelayAdapter(ndkRelay, this.ndk);
      this.adapters.set(url, adapter);
    }
    return adapter;
  }

  /**
   * Feed a challenge to the correct relay adapter.
   * Called from the NDK auth policy.
   */
  feedChallenge(relayUrl: string, challenge: string): NDKRelayAdapter {
    const ndkRelay = this.ndk.pool.getRelay(relayUrl, false);
    const adapter = this.getOrCreateAdapter(ndkRelay);
    adapter.receiveChallenge(challenge);
    return adapter;
  }
}

/**
 * Creates and wires up the auth manager with NDK.
 *
 * Replaces NDK's default signIn auth policy with a managed one that:
 * - Checks stored preferences (always/never)
 * - Shows toast prompts for unknown relays
 * - Prevents infinite retry loops via state machine
 * - Persists user decisions to localStorage
 */
export function createNDKAuthManager(ndk: NDK): {
  authManager: RelayAuthManager;
  signer$: BehaviorSubject<AuthSigner | null>;
  pendingChallenges$: Observable<PendingAuthChallenge[]>;
} {
  const signer$ = new BehaviorSubject<AuthSigner | null>(null);
  const poolAdapter = new NDKPoolAdapter(ndk);

  const authManager = new RelayAuthManager({
    pool: poolAdapter,
    signer$,
    storage: localStorage,
    challengeTTL: 5 * 60 * 1000, // 5 minutes
  });

  // Replace NDK's auth policy to route through relay-auth-manager
  ndk.relayAuthDefaultPolicy = async (
    relay: NDKRelay,
    challenge: string,
  ): Promise<boolean | undefined> => {
    // Feed the challenge to the relay adapter so relay-auth-manager sees it
    poolAdapter.feedChallenge(relay.url, challenge);

    // Return undefined — we handle auth ourselves via relay-auth-manager.
    // relay-auth-manager will call adapter.authenticate() when appropriate.
    return undefined;
  };

  // Create adapters for relays already in the pool
  for (const ndkRelay of ndk.pool.relays.values()) {
    const adapter = poolAdapter.getOrCreateAdapter(ndkRelay);
    authManager.monitorRelay(adapter);
  }

  return {
    authManager,
    signer$,
    pendingChallenges$: authManager.pendingChallenges$,
  };
}

/**
 * Update the signer$ BehaviorSubject when NDK signer changes.
 * Call this after user login.
 */
export function updateAuthSigner(
  signer$: BehaviorSubject<AuthSigner | null>,
  ndk: NDK,
): void {
  if (ndk.signer) {
    // The signer object signals to relay-auth-manager that signing is available.
    // Actual signing happens in NDKRelayAdapter.authenticate() using ndk.signer directly.
    signer$.next({
      signEvent: () => Promise.resolve(),
    });
  } else {
    signer$.next(null);
  }
}

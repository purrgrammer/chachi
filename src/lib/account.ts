import { useAtom, useAtomValue } from "jotai";
import { nip19 } from "nostr-tools";
import { toast } from "sonner";
import NDK, {
  NDKUser,
  NDKPrivateKeySigner,
  NDKNip07Signer,
  NDKNip46Signer,
} from "@nostr-dev-kit/ndk";
import { useNDK, authSigner$ } from "@/lib/ndk";
import { updateAuthSigner } from "@/lib/ndk-auth-adapter";
import type { Account, LoginMethod } from "@/lib/types";
import {
  useResetState,
  methodAtom,
  accountAtom,
  accountsAtom,
  followsAtom,
  mintListAtom,
  dmRelaysAtom,
} from "@/app/store";
import { useRelays } from "@/lib/nostr";
import { useCallback } from "react";

export function useAccount(): Account | null {
  const account = useAtomValue(accountAtom);
  return account;
}

export function usePubkey(): string | undefined {
  const account = useAtomValue(accountAtom);
  return account?.pubkey;
}

export function useCanSign() {
  const account = useAccount();
  return account?.pubkey && !account.isReadOnly;
}

export function useFollows() {
  return useAtomValue(followsAtom);
}

export function useLogout() {
  const resetState = useResetState();
  return () => {
    resetState();
  };
}

export function useNip07Login() {
  const ndk = useNDK();
  const [, setAccount] = useAtom(accountAtom);
  const [accounts, setAccounts] = useAtom(accountsAtom);
  const [, setLoginMethod] = useAtom(methodAtom);
  return async () => {
    try {
      const signer = new NDKNip07Signer();
      const user = await signer.blockUntilReady();
      ndk.signer = signer;
      updateAuthSigner(authSigner$, ndk);
      const account = { method: "nip07" as LoginMethod, pubkey: user.pubkey };
      setAccount(account);
      setAccounts([account, ...accounts]);
      setLoginMethod("nip07");
    } catch (err) {
      console.error(err);
      toast.error("Error logging in with NIP-07");
    }
  };
}

async function getNostrConnectSettings(ndk: NDK, nostrConnect: string) {
  try {
    if (nostrConnect.startsWith("bunker://")) {
      const asURL = new URL(nostrConnect);
      const relays = asURL.searchParams.getAll("relay");
      const token = asURL.searchParams.get("secret");
      const pubkey = asURL.hostname || asURL.pathname.replace(/^\/\//, "");
      return { relays, pubkey, token };
    } else {
      const user = await NDKUser.fromNip05(nostrConnect, ndk);
      if (user) {
        const pubkey = user.pubkey;
        const relays =
          user.nip46Urls?.length > 0
            ? user.nip46Urls
            : ["wss://relay.nsecbunker.com"];
        return {
          pubkey,
          relays,
        };
      }
    }
  } catch (error) {
    console.error(error);
  }
}

export function useNip46Login() {
  const ndk = useNDK();
  const [, setAccount] = useAtom(accountAtom);
  const [accounts, setAccounts] = useAtom(accountsAtom);
  const [, setLoginMethod] = useAtom(methodAtom);
  return async (remoteSignerURL: string) => {
    try {
      const localSigner = NDKPrivateKeySigner.generate();
      const settings = await getNostrConnectSettings(ndk, remoteSignerURL);
      if (settings) {
        const { relays } = settings;
        const bunkerNDK = new NDK({
          explicitRelayUrls: relays,
        });
        const signer = new NDKNip46Signer(
          bunkerNDK,
          remoteSignerURL,
          localSigner,
        );
        signer.rpc.encryptionType = "nip44";
        signer.on("authUrl", (url) => {
          window.open(url, "auth", "width=600,height=600");
        });
        const user = await signer.blockUntilReady();
        ndk.signer = signer;
        updateAuthSigner(authSigner$, ndk);
        const account = {
          method: "nip46" as LoginMethod,
          pubkey: user.pubkey,
          bunker: remoteSignerURL,
          secret: localSigner.privateKey,
          relays,
        };
        setAccount(account);
        setAccounts([account, ...accounts]);
        setLoginMethod("nip46");
      } else {
        toast.error("Invalid NIP-46 URL");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error logging in with NIP-46");
    }
  };
}
export function useNsecLogin() {
  const ndk = useNDK();
  const [, setAccount] = useAtom(accountAtom);
  const [accounts, setAccounts] = useAtom(accountsAtom);
  const [, setLoginMethod] = useAtom(methodAtom);
  return async (privateKey: string) => {
    try {
      const decoded = privateKey.startsWith("nsec1")
        ? nip19.decode(privateKey)
        : null;
      let privkey = privateKey;
      if (decoded && decoded.type === "nsec") {
        privkey = Buffer.from(decoded.data).toString("hex");
      }
      const signer = new NDKPrivateKeySigner(privkey);
      const user = await signer.blockUntilReady();
      ndk.signer = signer;
      updateAuthSigner(authSigner$, ndk);
      const account = {
        method: "nsec" as LoginMethod,
        pubkey: user.pubkey,
        privkey,
      };
      setAccount(account);
      setAccounts([account, ...accounts]);
      setLoginMethod("nsec");
    } catch (err) {
      console.error(err);
      toast.error("Error logging in with NSEC");
    }
  };
}

export function useMintList() {
  return useAtomValue(mintListAtom);
}

export function useDMRelays() {
  const outboxRelays = useRelays();
  const dmRelays = useAtomValue(dmRelaysAtom);
  if (dmRelays.length > 0) {
    const dm = dmRelays.map((relay) => relay.url);
    return { dm, fallback: [] };
  } else {
    return { dm: [], fallback: outboxRelays };
  }
}

export function useNstart(path?: string) {
  const createAccount = useCallback(() => {
    const query = new URLSearchParams();
    query.append("an", "chachi"); // app name
    query.append("at", "web"); // app type
    query.append(
      "ac",
      path ? `https://chachi.chat${path}` : "https://chachi.chat",
    ); // app callback url
    query.append("asb", "yes"); // skip bunker
    query.append("aa", "6d29d9"); // accent color
    const nstart = `https://nstart.me?${query.toString()}`;
    window.location.href = nstart;
  }, [path]);

  return { createAccount };
}

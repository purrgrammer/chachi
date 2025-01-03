import { useAtom, useAtomValue } from "jotai";
import { toast } from "sonner";
import NDK, {
  NDKUser,
  NDKPrivateKeySigner,
  NDKNip07Signer,
  NDKNip46Signer,
} from "@nostr-dev-kit/ndk";
import { useNDK } from "@/lib/ndk";
import type { Account, LoginMethod } from "@/lib/types";
import {
  useResetState,
  methodAtom,
  accountAtom,
  accountsAtom,
  followsAtom,
} from "@/app/store";

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
        const pubkey = user.hexpubkey;
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
        signer.on("authUrl", (url) => {
          window.open(url, "auth", "width=600,height=600");
        });
        const user = await signer.blockUntilReady();
        ndk.signer = signer;
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

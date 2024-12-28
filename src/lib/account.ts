import { useAtom, useAtomValue } from "jotai";
import { toast } from "sonner";
import { NDKNip07Signer } from "@nostr-dev-kit/ndk";
import { useNDK } from "@/lib/ndk";
import type { Account } from "@/lib/types";
import {
  useResetState,
  methodAtom,
  accountAtom,
  followsAtom,
} from "@/app/store";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
  const ndk = useNDK();
  const [, setAccount] = useAtom(accountAtom);
  const [, setLoginMethod] = useAtom(methodAtom);
  return async () => {
    try {
      const signer = new NDKNip07Signer();
      const user = await signer.blockUntilReady();
      ndk.signer = signer;
      setAccount({ method: "nip07", pubkey: user.pubkey });
      setLoginMethod("nip07");
    } catch (err) {
      console.error(err);
      toast.error(t("nav.user.login.error-nip07"));
    }
  };
}

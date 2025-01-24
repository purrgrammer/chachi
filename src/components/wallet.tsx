import { useState, useEffect } from "react";
import { Wallet as WalletIcon, Puzzle, Cable, RotateCw } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import NDK from "@nostr-dev-kit/ndk";
import { NDKNWCWallet } from "@nostr-dev-kit/ndk-wallet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNDK } from "@/lib/ndk";
import { useWallet } from "@/lib/wallet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";

function WalletInfo({ wallet }) {
  useEffect(() => {
  }, []);
  return <>{JSON.stringify(wallet.status, null, 2)}</>;
}

function ConnectWallet() {
  const { t } = useTranslation();
  const ndk = useNDK();
  const [wallet, setWallet] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoadingWebln, setIsLoadingWebln] = useState(false);
  const [connectString, setConnectString] = useState("");
  const isValidNwcString = connectString.startsWith("nostr+walletconnect://");

  function connectWebln() {
    if (!isLoadingWebln) {
      toast.error(t("wallet.dialog.webln-unavailable"));
      return;
    }
    try {
      const wallet = new NDKWebLNWallet();
      ndk.wallet = wallet;
      setWallet(wallet);
      toast.success(t("wallet.dialog.webln-connected"));
    } catch (e) {
      console.error(e);
      toast.error(t("wallet.dialog.webln-error"));
    }
  }

  async function connectNwc() {
    if (!connectString) {
      toast.error(t("wallet.dialog.nwc-empty"));
      return;
    }
    try {
	    const relays = new URL(connectString).searchParams.getAll("relay");
	    const walletNdk = new NDK({ explicitRelayUrls: relays });
      const nwc = new NDKNWCWallet(walletNdk);
      try {
        setIsConnecting(true);
        await nwc.initWithPairingCode(connectString);
	console.log("WALLET INITIALISED", nwc);
	setWallet(nwc);
	ndk.wallet = nwc;
      } catch (e) {
        console.error(e);
        toast.error(t("wallet.dialog.nwc-error"));
      } finally {
        setIsConnecting(false);
      }
    } catch (e) {
      console.error(e);
      toast.error(t("wallet.dialog.nwc-error"));
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="secondary" size="fit">
          {t("wallet.connect")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("wallet.dialog.title")}</DialogTitle>
          <DialogDescription>
            {t("wallet.dialog.description")}
          </DialogDescription>
        </DialogHeader>

        {wallet ? (
          <div className="my-2">
            <WalletInfo wallet={wallet} />
          </div>
        ) : null}

        <div className="flex flex-col gap-2">
          <Input
            disabled={isConnecting}
            placeholder="nostr+walletconnect://"
            value={connectString}
            onChange={(e) => setConnectString(e.target.value)}
          />
          <Button
            disabled={!isValidNwcString || isConnecting}
            variant="secondary"
            onClick={connectNwc}
          >
            {isConnecting ? <RotateCw className="animate-spin" /> : <Cable />}
            {t("wallet.dialog.connect-nip60")}
          </Button>
        </div>
        <p className="my-2 mx-auto text-xs text-muted-foreground">
          {t("user.login.or")}
        </p>
        <div className="flex flex-col gap-3">
          <Button
            variant="secondary"
            disabled={isLoadingWebln}
            onClick={connectWebln}
          >
            {isLoadingWebln ? (
              <RotateCw className="animate-spin" />
            ) : (
              <Puzzle />
            )}
            {t("wallet.dialog.connect-webln")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Wallet() {
  const w = useWallet();
  return (
    <div className="px-2 flex flex-row items-center justify-between">
      <div className="flex flex-row gap-2 items-center">
        <WalletIcon className="size-4 text-muted-foreground" />
        <span className="text-sm">Wallet</span>
      </div>
      {w ? <>TODO</> : <ConnectWallet />}
    </div>
  );
}

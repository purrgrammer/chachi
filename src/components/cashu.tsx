import { useState, useEffect } from "react";
import { HandCoins, Bitcoin, Euro, DollarSign, RotateCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Token, getDecodedToken } from "@cashu/cashu-ts";
import {
  NDKCashuWallet,
  NDKWebLNWallet,
  NDKNWCWallet,
} from "@nostr-dev-kit/ndk-wallet";
import { Button } from "@/components/ui/button";
import { usePubkey } from "@/lib/account";
import { formatShortNumber } from "@/lib/number";
import { cn } from "@/lib/utils";
import { useWallet } from "@/lib/wallet";

function RedeemToken({ token }: { token: string }) {
  const [isRedeeming, setIsRedeeming] = useState(false);
  const { t } = useTranslation();
  const wallet = useWallet();

  // todo: use wallet
  async function redeem() {
    if (!wallet) return;

    try {
      setIsRedeeming(true);
      if (wallet instanceof NDKCashuWallet) {
        // todo: if not a token in our mints, swap to our mint and redeem
        await wallet.receiveToken(token);
        toast.success(`Ecash redeemed`);
      } else if (wallet instanceof NDKWebLNWallet) {
        console.log("TODO: WebLN Wallet");
      } else if (wallet instanceof NDKNWCWallet) {
        console.log("TODO: NWC Wallet");
      }
    } catch (err) {
      toast.error(
        `Error redeeming token: ${(err as Error | undefined)?.message || "Unknown error"}`,
      );
      // todo: error state
    } finally {
      setIsRedeeming(false);
    }
  }

  return (
    <Button
      variant="outline"
      disabled={!wallet || isRedeeming}
      onClick={redeem}
    >
      {isRedeeming ? <RotateCw className="animate-spin" /> : <HandCoins />}
      {t("ecash.redeem")}
    </Button>
  );
}

export function CashuToken({
  token,
  className,
}: {
  token: string;
  className?: string;
}) {
  const me = usePubkey();
  const [ecash, setEcash] = useState<Token | null>(null);
  const unit = ecash?.unit ?? "sat";
  const sum = ecash?.proofs.reduce((acc, t) => acc + t.amount, 0) ?? 0;
  const total = unit === "msat" ? sum / 1000 : sum;
  const unitClassname = "size-10 text-muted-foreground";

  useEffect(() => {
    try {
      if (!token.startsWith("cashu") || token.length < 10) {
        return;
      }
      setEcash(getDecodedToken(token));
    } catch (err) {
      console.error(err);
    }
  }, [token]);

  if (!ecash) {
    return <p className="break-all font-mono">{token}</p>;
  }
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div className="flex gap-5 items-center">
        <div className="flex flex-row items-center">
          {unit === "sat" ? (
            <Bitcoin className={unitClassname} />
          ) : unit === "eur" ? (
            <Euro className={unitClassname} />
          ) : unit === "usd" ? (
            <DollarSign className={unitClassname} />
          ) : null}
          <span className="font-mono text-5xl">{formatShortNumber(total)}</span>
        </div>
        {ecash.memo ? (
          <p className="text-3xl text-muted-foreground line-clamp-1">
            {ecash.memo}
          </p>
        ) : null}
      </div>
      {me ? <RedeemToken token={token} /> : null}
    </div>
  );
}

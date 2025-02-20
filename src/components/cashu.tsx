import { QRCodeSVG } from "qrcode.react";
import { useState, useEffect } from "react";
import { HandCoins, Bitcoin, Euro, DollarSign, RotateCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Token, getDecodedToken } from "@cashu/cashu-ts";
import { Button } from "@/components/ui/button";
import { usePubkey } from "@/lib/account";
import { formatShortNumber } from "@/lib/number";
import { cn } from "@/lib/utils";
import { Copy, Check } from "lucide-react";
import { useCopy } from "@/lib/hooks";
import { useCashuWallet } from "@/lib/wallet";

export function EcashToken({
  token,
  picture,
}: {
  token: string;
  picture?: string;
}) {
  const [copied, copy] = useCopy();
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center gap-2 w-full">
      <div className="h-[264px] qr-code">
        <QRCodeSVG
          className="rounded-sm svg-qr-code"
          includeMargin
          size={256}
          marginSize={4}
          value={token}
          imageSettings={
            picture
              ? {
                  src: picture,
                  height: 48,
                  width: 48,
                  excavate: false,
                }
              : undefined
          }
        />
      </div>
      <Button
        disabled={copied}
        variant="secondary"
        className="w-[256px] transition-colors"
        onClick={() => copy(token)}
      >
        {copied ? <Check /> : <Copy />} {t("zap.dialog.copy")}
      </Button>
    </div>
  );
}

function RedeemToken({ token }: { token: string }) {
  const [isRedeeming, setIsRedeeming] = useState(false);
  const { t } = useTranslation();
  const wallet = useCashuWallet();

  async function redeem() {
    if (!wallet) return;

    try {
      setIsRedeeming(true);
      await wallet.receiveToken(token);
      toast.success(`Ecash redeemed`);
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

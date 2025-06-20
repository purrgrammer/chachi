import { useState, useMemo } from "react";
import { decode } from "light-bolt11-decoder";
import { QRCodeSVG } from "qrcode.react";
import { useTranslation } from "react-i18next";
import {
  Eye,
  EyeClosed,
  HandCoins,
  Coins,
  Bitcoin,
  ReceiptText,
} from "lucide-react";
import { InputCopy } from "@/components/ui/input-copy";
import { NewZapDialog } from "@/components/nostr/zap";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Wallet, Copy, Check, Zap } from "lucide-react";
import { useCopy } from "@/lib/hooks";
import { formatShortNumber } from "@/lib/number";

export function Invoice({
  invoice,
  picture,
  showSummary,
  onConfirm,
  canPay,
}: {
  invoice: string;
  picture?: string;
  showSummary?: boolean;
  onConfirm?: () => void;
  canPay?: boolean;
}) {
  const [showQr, setShowQr] = useState(false);
  const [copied, copy] = useCopy();
  const { t } = useTranslation();
  const decoded = useMemo(
    () => (showSummary ? decode(invoice) : null),
    [showSummary],
  );
  const amount = decoded?.sections.find((s) => s.name === "amount")?.value;

  function openWallet() {
    try {
      window.open(`lightning:${invoice}`, "_blank");
    } catch (err) {
      console.error(err);
      toast.error(t("zap.dialog.wallet-error"));
    }
  }

  return (
    <div className="flex flex-col items-center justify-center gap-2 w-full">
      {showSummary ? (
        <>
          {amount ? (
            <div className="flex w-full flex-row gap-10 justify-between">
              <div className="flex flex-row items-center gap-1">
                <Coins className="size-3 text-muted-foreground" />
                <h3 className="text-sm uppercase font-light text-muted-foreground">
                  {t("zap.dialog.amount")}
                </h3>
              </div>
              <div className="flex flex-row items-center gap-0">
                <Bitcoin className="size-8 text-muted-foreground" />
                <span className="font-mono text-4xl">
                  {Number(amount) / 1000}
                </span>
              </div>
            </div>
          ) : null}
          <div className="flex w-full flex-row gap-10 justify-between">
            <div className="flex flex-row items-center gap-1">
              <ReceiptText className="size-3 text-muted-foreground" />
              <h3 className="text-sm uppercase font-light text-muted-foreground">
                {t("zap.dialog.invoice")}
              </h3>
            </div>
            <InputCopy value={invoice} />
          </div>
          <Button
            variant="secondary"
            className="w-full"
            size="sm"
            onClick={() => setShowQr(!showQr)}
          >
            {showQr ? <EyeClosed /> : <Eye />}
            {showQr ? t("ln.send.hide-qr") : t("ln.send.show-qr")}
          </Button>
          <Button className="w-full" onClick={openWallet}>
            <Wallet /> {t("zap.dialog.wallet")}
          </Button>
          {showQr ? (
            <div className="h-[264px] qr-code">
              <QRCodeSVG
                className="rounded-sm svg-qr-code"
                includeMargin
                size={256}
                marginSize={4}
                value={invoice}
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
          ) : null}
          {onConfirm && amount ? (
            <Button
              disabled={!canPay}
              className="w-full mt-4"
              onClick={onConfirm}
            >
              <HandCoins />{" "}
              {t("ln.send.title", {
                amount: formatShortNumber(Number(amount) / 1000),
              })}
            </Button>
          ) : null}
        </>
      ) : (
        <>
          <div className="h-[264px] qr-code">
            <QRCodeSVG
              className="rounded-sm svg-qr-code"
              includeMargin
              size={256}
              marginSize={4}
              value={invoice}
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
            onClick={() => copy(invoice)}
          >
            {copied ? <Check /> : <Copy />} {t("zap.dialog.copy")}
          </Button>
          <Button className="w-[256px]" onClick={openWallet}>
            <Wallet /> {t("zap.dialog.wallet")}
          </Button>
        </>
      )}
    </div>
  );
}

export function LnAddress({
  pubkey,
  address,
}: {
  pubkey: string;
  address: string;
}) {
  return (
    <NewZapDialog
      zapType="nip-57"
      pubkey={pubkey}
      trigger={
        <Button variant="ghost" size="tiny">
          <div className="flex flex-row items-center gap-1">
            <Zap className="size-4 text-muted-foreground" />
            <span className="font-mono text-xs">{address}</span>
          </div>
        </Button>
      }
    />
  );
}

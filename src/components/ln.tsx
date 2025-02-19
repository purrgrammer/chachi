import { QRCodeSVG } from "qrcode.react";
import { useTranslation } from "react-i18next";
import { NewZapDialog } from "@/components/nostr/zap";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Wallet, Copy, Check, Zap } from "lucide-react";
import { useCopy } from "@/lib/hooks";

export function Invoice({
  invoice,
  picture,
}: {
  invoice: string;
  picture?: string;
}) {
  const [copied, copy] = useCopy();
  const { t } = useTranslation();
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

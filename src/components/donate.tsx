import { useState } from "react";
import { NewZapDialog } from "./nostr/zap";
import { useTranslation } from "react-i18next";
import { CHACHI_PUBKEY, CHACHI_GROUP } from "@/constants";
import { toast } from "sonner";
import { Button, ButtonProps } from "./ui/button";
import { HandHeart } from "lucide-react";

export function Donate({ size = "lg", ...props }: ButtonProps) {
  const [showDonateDialog, setShowDonateDialog] = useState(false);
  const { t } = useTranslation();

  function onZap() {
    setShowDonateDialog(false);
    toast.success(t("user.thank-you"));
  }
  return (
    <>
      <Button onClick={() => setShowDonateDialog(true)} size={size} {...props}>
        <HandHeart />
        <span className="font-normal">{t("user.donate")}</span>
      </Button>
      {showDonateDialog ? (
        <NewZapDialog
          open
          title={t("user.support-chachi")}
          description={t("user.support-chachi-description")}
          defaultAmount={420}
          onClose={() => setShowDonateDialog(false)}
          onZap={onZap}
          pubkey={CHACHI_PUBKEY}
          group={CHACHI_GROUP}
          zapType="nip-57"
        />
      ) : null}
    </>
  );
}

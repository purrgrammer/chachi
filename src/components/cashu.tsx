import { QRCodeSVG } from "qrcode.react";
import { useState, useEffect } from "react";
import {
  Copy,
  Check,
  HandCoins,
  RotateCw,
  ReceiptText,
  Banknote,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Token, getDecodedToken, PaymentRequest } from "@cashu/cashu-ts";
import { User } from "@/components/nostr/user";
import { Button } from "@/components/ui/button";
import { usePubkey } from "@/lib/account";
import { cn } from "@/lib/utils";
import Amount from "@/components/amount";
import { HUGE_AMOUNT } from "@/lib/zap";
import { useCopy } from "@/lib/hooks";
import { useCashuWallet, useNDKWallet } from "@/lib/wallet";
import { nip19 } from "nostr-tools";
import { WalletSelector } from "./wallet";
import {
  DialogTrigger,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

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
      <code className="font-mono text-xs break-all">{token}</code>
      <Button
        disabled={copied}
        variant="secondary"
        className="w-[256px] transition-colors"
        onClick={() => copy(token)}
      >
        {copied ? <Check /> : <Copy />} {t("wallet.ecash.copy")}
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
    } finally {
      setIsRedeeming(false);
    }
  }

  return (
    <Button variant="ghost" disabled={!wallet || isRedeeming} onClick={redeem}>
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
    <div
      className={cn(
        "flex flex-col gap-1 p-1 px-2 border rounded-md relative bg-background/80 rounded-md",
        className,
      )}
    >
      <div
        className={cn(
          "border-gradient rounded-md",
          sum >= HUGE_AMOUNT ? "border-animated-gradient" : "",
        )}
      >
        <Amount amount={total} currency={unit} size="md" />
      </div>
      {ecash.memo ? <p className="text-md line-clamp-2">{ecash.memo}</p> : null}
      {me ? <RedeemToken token={token} /> : null}
    </div>
  );
}

export function NProfile({ nprofile }: { nprofile: string }) {
  const [pubkey, setPubkey] = useState<string | null>(null);
  const [relays, setRelays] = useState<string[]>([]);

  useEffect(() => {
    try {
      const decoded = nip19.decode(nprofile);
      if (decoded.type === "nprofile") {
        setPubkey(decoded.data.pubkey);
        setRelays(decoded.data.relays ?? []);
      } else if (decoded.type === "npub") {
        setPubkey(decoded.data);
      }
    } catch (err) {
      console.error(err);
    }
  }, [nprofile]);

  return pubkey ? (
    <User
      pubkey={pubkey}
      relays={relays}
      classNames={{
        avatar: "size-6",
        name: "text-lg",
      }}
    />
  ) : null;
}

export function PayCashuRequest({
  request,
  className,
}: {
  request: PaymentRequest;
  className?: string;
}) {
  const { t } = useTranslation();
  const [isPaying, setIsPaying] = useState(false);
  const [wallet] = useNDKWallet();
  const cashuWallet = useCashuWallet();
  const isPaid = false && request.singleUse;

  async function payRequest() {
    try {
      setIsPaying(true);
      // todo: implement cashu request payment
    } catch (err) {
      console.error(err);
    } finally {
      setIsPaying(false);
    }
  }

  console.log(request, className);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          disabled={isPaying || (!wallet && !cashuWallet)}
          className="w-full"
          onClick={payRequest}
        >
          {isPaying ? <RotateCw className="animate-spin" /> : <Banknote />}
          {t("ecash.pay-request")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("ecash.pay-request")}</DialogTitle>
        </DialogHeader>
        <CashuRequestDetails request={request} />
        <WalletSelector />
        <DialogFooter>
          {isPaid ? (
            <div className="flex flex-row items-center justify-center gap-2 h-10">
              <Check className="size-7 text-green-500" />
              <span className="text-xl">{t("ecash.paid-request")}</span>
            </div>
          ) : (
            <Button disabled={!wallet} onClick={payRequest} className="w-full">
              <Banknote />
              {t("ecash.pay")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CashuRequestDetails({ request }: { request: PaymentRequest }) {
  const nostrTarget = request.transport?.find((t) => t.type === "nostr");
  const pubkey = nostrTarget?.target;
  const description = request.description;
  const amount = request.amount;

  return (
    <div className="flex flex-row items-center gap-6 justify-between">
      {pubkey ? <NProfile nprofile={pubkey} /> : null}
      {description ? (
        <p className="text-sm text-muted-foreground">{description}</p>
      ) : null}
      {amount ? (
        <Amount amount={amount} currency="sat" size="large-display" />
      ) : null}
    </div>
  );
}

export function CashuRequest({
  token,
  className,
}: {
  token: string;
  className?: string;
}) {
  const { t } = useTranslation();
  const [req, setReq] = useState<PaymentRequest | null>(null);
  const amount = req?.amount;
  const nostrTarget = req?.transport?.find((t) => t.type === "nostr");
  const unit = req?.unit;
  const pubkey = nostrTarget?.target;
  const mints = req?.mints;
  // todo: check if paid

  useEffect(() => {
    try {
      if (!token.startsWith("creqA") || token.length < 10) {
        return;
      }
      setReq(PaymentRequest.fromEncodedRequest(token));
    } catch (err) {
      console.error(err);
    }
  }, [token]);

  return req && amount && unit && pubkey && mints ? (
    <div
      className={cn(
        "flex flex-col gap-2 p-2 border rounded-md relative bg-background min-w-md",
        className,
      )}
    >
      <div className="flex w-full flex-row gap-10 justify-between">
        <div className="flex flex-row items-center gap-1">
          <ReceiptText className="size-3 text-muted-foreground" />
          <h3 className="text-sm uppercase font-light text-muted-foreground">
            {t("ecash.request")}
          </h3>
        </div>
      </div>
      <CashuRequestDetails request={req} />
      <PayCashuRequest request={req} className={className} />
    </div>
  ) : null;
}

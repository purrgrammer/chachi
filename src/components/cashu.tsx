import { useState, useEffect } from "react";
import { Bitcoin, Euro, DollarSign } from "lucide-react";
import { getDecodedToken } from "@cashu/cashu-ts";
import { Button } from "@/components/ui/button";
import { formatShortNumber } from "@/lib/number";
import { useProfile } from "@/lib/nostr";
import { cn } from "@/lib/utils";
import { useAccount } from "@/lib/account";

type Unit = "msat" | "sat" | "eur" | "usd" | string;

interface Token {
  token: Array<{
    mint: string;
    proofs: Array<{
      amount: number;
    }>;
  }>;
  memo?: string;
  unit?: Unit;
}

function RedeemToken({ token, pubkey }: { token: string; pubkey: string }) {
  const { data: profile } = useProfile(pubkey);
  const lnurl = profile?.lud16 ?? "";

  async function redeem() {
    const url = `https://redeem.cashu.me?token=${encodeURIComponent(token)}&lightning=${encodeURIComponent(
      lnurl,
    )}&autopay=yes`;
    window.open(url, "_blank");
  }

  return (
    <Button disabled={!lnurl} onClick={redeem}>
      Redeem
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
  const account = useAccount();
  const me = account?.pubkey;
  const [ecash, setEcash] = useState<Token | null>(null);

  useEffect(() => {
    try {
      if (!token.startsWith("cashuA") || token.length < 10) {
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

  const unit = ecash.unit ?? "sat";
  const sum = ecash.token.reduce(
    (acc, t) => acc + t.proofs.reduce((acc, p) => acc + p.amount, 0),
    0,
  );
  const total = unit === "msat" ? sum / 1000 : sum;
  const unitClassname = "size-10 text-muted-foreground";

  return (
    <div className={cn("flex flex-col gap-5", className)}>
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
      {me ? <RedeemToken token={token} pubkey={me} /> : null}
    </div>
  );
}

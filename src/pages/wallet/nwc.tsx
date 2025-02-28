import { PlugZap } from "lucide-react";
import { useParams } from "react-router-dom";
import { Header } from "@/components/header";
import { Wallet, WalletName } from "@/components/wallet";
import { useNWCWallet } from "@/lib/wallet";

export default function NWCWallet() {
  const { connection } = useParams();
  const wallet = useNWCWallet(connection);
  return (
    <>
      <Header>
        <div className="flex flex-row items-center gap-2">
          <PlugZap className="size-5 text-muted-foreground" />
          {wallet ? <WalletName wallet={wallet} /> : null}
        </div>
      </Header>
      <div className="p-4 h-[94vh]">
        <div className="flex items-center justify-center">
          <div className="w-full max-w-96">
            {wallet ? <Wallet wallet={wallet} /> : null}
          </div>
        </div>
      </div>
    </>
  );
}

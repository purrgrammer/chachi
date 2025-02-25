import { Puzzle } from "lucide-react";
import { Header } from "@/components/header";
import { Wallet, WalletName } from "@/components/wallet";
import { useWebLNWallet } from "@/lib/wallet";

export default function WebLNWallet() {
  const wallet = useWebLNWallet();
  return (
    <>
      <Header>
        <div className="flex flex-row items-center gap-2">
          <Puzzle className="size-5 text-muted-foreground" />
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

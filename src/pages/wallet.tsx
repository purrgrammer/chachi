import { Wallet as WalletIcon } from "lucide-react";
import { Header } from "@/components/header";
import { WalletName, WalletSettings } from "@/components/wallet";
import { useCashuWallet } from "@/lib/wallet";

export default function Wallet() {
  const cashuWallet = useCashuWallet();
  return (
    <>
      <Header>
        <div className="flex flex-row items-center w-full justify-between">
          {cashuWallet ? <WalletName wallet={cashuWallet} /> : null}
          <WalletIcon className="size-5 text-muted-foreground" />
        </div>
      </Header>
      <div className="p-4">
        <div className="flex items-center justify-center">
          <div className="w-full max-w-96">
            <WalletSettings />
          </div>
        </div>
      </div>
    </>
  );
}

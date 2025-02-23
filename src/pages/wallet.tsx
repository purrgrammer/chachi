import { Wallet as WalletIcon } from "lucide-react";
import { Header } from "@/components/header";
import { WalletName, EditWallet, WalletSettings } from "@/components/wallet";
import { useCashuWallet } from "@/lib/wallet";

export default function Wallet() {
  const cashuWallet = useCashuWallet();
  return (
    <>
      <Header>
        <div className="flex flex-row items-center w-full justify-between">
          <div className="flex flex-row items-center gap-2">
            <WalletIcon className="size-5 text-muted-foreground" />
            {cashuWallet ? <WalletName wallet={cashuWallet} /> : null}
          </div>
          {cashuWallet ? <EditWallet wallet={cashuWallet} /> : null}
        </div>
      </Header>
      <div className="p-4 h-[94vh]">
        <div className="flex items-center justify-center">
          <div className="w-full h-full max-w-96">
            <WalletSettings />
          </div>
        </div>
      </div>
    </>
  );
}

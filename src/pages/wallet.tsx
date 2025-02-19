import { Header } from "@/components/header";
import { WalletBalance, WalletSettings } from "@/components/wallet";
import { useCashuWallet } from "@/lib/wallet";

export default function Wallet() {
  const cashuWallet = useCashuWallet();
  return (
    <>
      <Header>
        {cashuWallet ? <WalletBalance wallet={cashuWallet} /> : null}
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

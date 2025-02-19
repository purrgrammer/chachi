import { Header } from "@/components/header";
import { useParams } from "react-router-dom";
import { Wallet, WalletBalance } from "@/components/wallet";
import { useNWCWallet } from "@/lib/wallet";

export default function NWCWallet() {
  const { connection } = useParams();
  const wallet = useNWCWallet(connection);
  return (
    <>
      <Header>{wallet ? <WalletBalance wallet={wallet} /> : null}</Header>
      <div className="p-4">
        <div className="flex items-center justify-center">
          <div className="w-full max-w-96">
            {wallet ? <Wallet wallet={wallet} /> : null}
          </div>
        </div>
      </div>
    </>
  );
}

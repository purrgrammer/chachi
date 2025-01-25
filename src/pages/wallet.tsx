import { WalletSettings } from "@/components/wallet";

// todo: select wallet
// todo: create wallet
// todo: connect NWC wallet

export default function Wallet() {
  return (
    <div className="p-4">
      <div className="flex items-center justify-center">
        <div className="w-full max-w-96">
          <WalletSettings />
        </div>
      </div>
    </div>
  );
}

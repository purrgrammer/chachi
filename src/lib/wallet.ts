type WalletType = "nwc" | "webln";

type Wallet = { type: WalletType; url?: string };

export function useWallet() {}

import { decode } from "light-bolt11-decoder";
import { NostrEvent } from "nostr-tools";

export interface Zap {
  id: string;
  amount: number;
  pubkey: string;
  content: string;
}

export function validateZap(zap: NostrEvent): Zap | null {
  const invoice = zap.tags.find((t) => t[0] === "bolt11")?.[1];
  const zapRequest = zap.tags.find((t) => t[0] === "description")?.[1];

  if (!invoice || !zapRequest) return null;

  try {
    const decoded = decode(invoice);
    const amountSection = decoded.sections.find(
      ({ name }) => name === "amount",
    );
    // @ts-expect-error: not correctly typed, will always have a value
    const amount = Number(amountSection?.value) / 1000;
    const req = JSON.parse(zapRequest);
    return amount
      ? {
          id: zap.id,
          pubkey: req.pubkey,
          amount,
          content: req.content,
        }
      : null;
  } catch (err) {
    console.error(err);
    return null;
  }
}

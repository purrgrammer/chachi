import { decode } from "light-bolt11-decoder";
import { NostrEvent } from "nostr-tools";

export interface Zap {
  id: string;
  amount: number;
  pubkey: string;
  content: string;
  e?: string;
  a?: string;
  p?: string;
  tags: string[][];
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
    const req = JSON.parse(zapRequest) as NostrEvent;
    return amount
      ? {
          id: zap.id,
          pubkey: req.pubkey,
          amount,
          content: req.content,
          e: req.tags.find((t) => t[0] === "e")?.[1],
          a: req.tags.find((t) => t[0] === "a")?.[1],
          p: req.tags.find((t) => t[0] === "p")?.[1],
          tags: req.tags,
        }
      : null;
  } catch (err) {
    console.error(err);
    return null;
  }
}

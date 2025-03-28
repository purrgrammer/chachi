import { decode } from "light-bolt11-decoder";
import { NostrEvent } from "nostr-tools";

export interface Zap {
  id: string;
  created_at: number;
  amount: number;
  pubkey: string;
  content: string;
  e?: string;
  a?: string;
  p?: string;
  tags: string[][];
}

export function validateZapRequest(
  zapRequest: string,
  invoice: string,
): Zap | null {
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
          id: req.id,
          pubkey: req.pubkey,
          created_at: req.created_at,
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

export function validateZap(zap: NostrEvent): Zap | null {
  const invoice = zap.tags.find((t) => t[0] === "bolt11")?.[1];
  const zapRequest = zap.tags.find((t) => t[0] === "description")?.[1];

  if (!invoice || !zapRequest) return null;

  return validateZapRequest(zapRequest, invoice);
}

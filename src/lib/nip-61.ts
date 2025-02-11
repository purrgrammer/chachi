import { NostrEvent } from "nostr-tools";

export interface Nutzap {
  id: string;
  amount: number;
  unit: "sat" | "msat" | "eur" | "usd" | string;
  pubkey: string;
  content: string;
  e?: string;
  a?: string;
  p?: string;
  tags: string[][];
}

export function validateNutzap(zap: NostrEvent): Nutzap | null {
  try {
    const proof = zap.tags.find((t) => t[0] === "proof")?.[1];
    if (!proof) return null;
    const tokens = JSON.parse(proof);
    const amount = Array.isArray(tokens)
      ? tokens.reduce((acc, t) => acc + t.amount, 0)
      : parseInt(tokens.amount);
    const unit = zap.tags.find((t) => t[0] === "unit")?.[1] || "msat";
    return amount
      ? {
          id: zap.id,
          pubkey: zap.pubkey,
          amount,
          unit: unit.startsWith("msat") ? "sat" : unit.toLowerCase(),
          content: zap.content,
          e: zap.tags.find((t) => t[0] === "e")?.[1],
          a: zap.tags.find((t) => t[0] === "a")?.[1],
          p: zap.tags.find((t) => t[0] === "p")?.[1],
          tags: zap.tags,
        }
      : null;
  } catch (err) {
    console.error(err);
    return null;
  }
}

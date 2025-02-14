import { NostrEvent } from "nostr-tools";

export interface Nutzap {
  id: string;
  amount: number;
  unit: "sat" | "msat" | "eur" | "usd" | string;
  pubkey: string;
  content: string;
  mint: string;
  e?: string;
  a?: string;
  p?: string;
  tags: string[][];
}

function sumProofs(proof: string): number {
  const tokens = JSON.parse(proof);
  return Array.isArray(tokens)
    ? tokens.reduce((acc, t) => acc + t.amount, 0)
    : parseInt(tokens.amount);
}

export function validateNutzap(zap: NostrEvent): Nutzap | null {
  try {
    const proofs = zap.tags.filter((t) => t[0] === "proof").map((t) => t[1]);
    if (proofs.length === 0) return null;
    const amount = proofs.reduce((acc, proof) => acc + sumProofs(proof), 0);
    const unit = zap.tags.find((t) => t[0] === "unit")?.[1] || "msat";
    const mint = zap.tags.find((t) => t[0] === "u")?.[1];
    return amount && mint
      ? {
          id: zap.id,
          pubkey: zap.pubkey,
          amount,
          mint,
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

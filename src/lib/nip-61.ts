import { NostrEvent } from "nostr-tools";

export type Nutzap = {
  id: string;
  created_at: number;
  amount: number;
  unit: "sat" | "msat" | "eur" | "usd" | string;
  p2pk?: string;
  pubkey: string;
  content: string;
  mint: string;
  e?: string;
  a?: string;
  p?: string;
  tags: string[][];
};

export function sumProofs(proof: string): number {
  const tokens = JSON.parse(proof);
  return Array.isArray(tokens)
    ? tokens.reduce((acc, t) => acc + t.amount, 0)
    : parseInt(tokens.amount);
}

export function validateNutzap(zap: NostrEvent): Nutzap | null {
  try {
    const id = zap.id;
    const proofs = zap.tags.filter((t) => t[0] === "proof").map((t) => t[1]);
    if (proofs.length === 0) return null;
    const amount = proofs.reduce((acc, proof) => acc + sumProofs(proof), 0);
    const proof = JSON.parse(proofs[0]);
    const secret = JSON.parse(proof.secret);
    const p2pkData =
      Array.isArray(secret) && secret[0] === "P2PK" ? secret[1] : null;
    const p2pk = p2pkData?.data;
    const unit = zap.tags.find((t) => t[0] === "unit")?.[1] || "msat";
    const mint = zap.tags.find((t) => t[0] === "u")?.[1];
    return id && amount && mint
      ? {
          id,
          amount,
          mint,
          created_at: zap.created_at,
          pubkey: zap.pubkey,
          unit: unit.startsWith("msat") ? "sat" : unit.toLowerCase(),
          content: zap.content,
          p2pk,
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

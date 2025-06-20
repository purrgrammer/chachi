import { nip19, nip05 } from "nostr-tools";

export interface ParsedIdentifier {
  pubkey: string;
  relays: string[];
  type: "npub" | "nprofile" | "hex" | "nip05";
}

export function parseProfileIdentifier(identifier: string): ParsedIdentifier | null {
  // Clean the identifier (remove leading/trailing spaces)
  const cleanIdentifier = identifier.trim();
  
  try {
    // Try to decode as NIP-19 first
    const decoded = nip19.decode(cleanIdentifier);
    
    if (decoded.type === "npub") {
      return {
        pubkey: decoded.data,
        relays: [],
        type: "npub"
      };
    }
    
    if (decoded.type === "nprofile") {
      return {
        pubkey: decoded.data.pubkey,
        relays: decoded.data.relays || [],
        type: "nprofile"
      };
    }
    
    // If NIP-19 decode fails, check other formats
  } catch (error) {
    // Not a valid NIP-19 identifier, try other formats
  }
  
  // Check if it's a hex pubkey (64 characters, hex)
  if (/^[a-fA-F0-9]{64}$/.test(cleanIdentifier)) {
    return {
      pubkey: cleanIdentifier,
      relays: [],
      type: "hex"
    };
  }
  
  // Check if it's a NIP-05 identifier (contains @ and .)
  if (cleanIdentifier.includes("@") && cleanIdentifier.includes(".")) {
    // For NIP-05, we need to resolve it to get the pubkey
    // This is async, so we'll handle it in the component
    return {
      pubkey: cleanIdentifier, // Will be resolved later
      relays: [],
      type: "nip05"
    };
  }
  
  return null;
}

export async function resolveNip05(identifier: string): Promise<string | null> {
  try {
    const profile = await nip05.queryProfile(identifier);
    return profile?.pubkey || null;
  } catch (error) {
    console.error("Error resolving NIP-05:", error);
    return null;
  }
}
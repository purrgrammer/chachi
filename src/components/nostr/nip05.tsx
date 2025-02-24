import { useProfile } from "@/lib/nostr";

export function Nip05({
  pubkey,
  relays = [],
}: {
  pubkey: string;
  relays?: string[];
}) {
  const { data: profile } = useProfile(pubkey, relays);
  return profile?.nip05?.replace(/^_@/, "") || null;
}

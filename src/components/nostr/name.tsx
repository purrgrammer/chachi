import { useProfile } from "@/lib/nostr";

export function Name({
  pubkey,
  relays = [],
}: {
  pubkey: string;
  relays?: string[];
}) {
  const { data: profile } = useProfile(pubkey, relays);
  return profile?.name || profile?.display_name || pubkey.slice(0, 6);
}

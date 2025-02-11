import { useProfile } from "@/lib/nostr";

export function Name({
  pubkey,
  relays = [],
  short = false,
}: {
  pubkey: string;
  relays?: string[];
  short?: boolean;
}) {
  const { data: profile } = useProfile(pubkey, relays);
  const name = (
    profile?.name ||
    profile?.display_name ||
    pubkey.slice(0, 6)
  ).trim();
  return short ? name.split(" ")[0] : name;
}

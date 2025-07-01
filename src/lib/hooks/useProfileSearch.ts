import { useMemo } from "react";
import { useProfiles } from "@/lib/nostr";
import { usePubkey } from "@/lib/account";

export function useProfileSearch(pubkeys: string[], searchQuery: string = "") {
  const { profiles } = useProfiles(pubkeys);
  const currentUserPubkey = usePubkey();

  return useMemo(() => {
    // If there's no search query, return profiles excluding current user
    if (!searchQuery) {
      return profiles
        .filter((p) => p.pubkey !== currentUserPubkey)
        .sort((a, b) => {
          // Sort by name for better UX
          const nameA = (a.name || a.display_name || a.pubkey).toLowerCase();
          const nameB = (b.name || b.display_name || b.pubkey).toLowerCase();
          return nameA.localeCompare(nameB);
        });
    }

    // Filter profiles based on search query
    return profiles
      .filter((p) => {
        // Exclude current user
        if (p.pubkey === currentUserPubkey) return false;

        const searchLower = searchQuery.toLowerCase();
        const name = (p.name || "").toLowerCase();
        const displayName = (p.display_name || "").toLowerCase();
        const pubkey = p.pubkey.toLowerCase();

        // Search in name, display_name, or pubkey
        return (
          name.includes(searchLower) ||
          displayName.includes(searchLower) ||
          pubkey.includes(searchLower)
        );
      })
      .sort((a, b) => {
        // Sort by relevance: exact match first, then startsWith, then includes
        const searchLower = searchQuery.toLowerCase();
        const nameA = (a.name || a.display_name || "").toLowerCase();
        const nameB = (b.name || b.display_name || "").toLowerCase();

        // Exact matches first
        if (nameA === searchLower && nameB !== searchLower) return -1;
        if (nameB === searchLower && nameA !== searchLower) return 1;

        // Then startsWith matches
        if (nameA.startsWith(searchLower) && !nameB.startsWith(searchLower))
          return -1;
        if (nameB.startsWith(searchLower) && !nameA.startsWith(searchLower))
          return 1;

        // Finally alphabetical
        return nameA.localeCompare(nameB);
      });
  }, [profiles, searchQuery, currentUserPubkey]);
}

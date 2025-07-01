import { useState, useMemo } from "react";
import { useProfiles } from "@/lib/nostr";
import { usePubkey } from "@/lib/account";
import type { Profile } from "@/lib/types";

export interface UseProfileAutocompleteOptions {
  pubkeys: string[];
  excludePubkeys?: string[];
  excludeCurrentUser?: boolean;
}

export interface UseProfileAutocompleteResult {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filteredProfiles: Profile[];
  selectedProfiles: Profile[];
  availableProfiles: Profile[];
  addProfile: (profile: Profile) => void;
  removeProfile: (pubkey: string) => void;
  clearSelection: () => void;
  isSelected: (pubkey: string) => boolean;
}

/**
 * Reusable hook for profile search and selection with autocomplete functionality
 */
export function useProfileAutocomplete({
  pubkeys,
  excludePubkeys = [],
  excludeCurrentUser = true,
}: UseProfileAutocompleteOptions): UseProfileAutocompleteResult {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPubkeys, setSelectedPubkeys] = useState<string[]>([]);

  const currentUserPubkey = usePubkey();
  const { profiles } = useProfiles(pubkeys);

  // Filter profiles based on search query and exclusions
  const filteredProfiles = useMemo(() => {
    let filtered = profiles;

    // Exclude current user if requested
    if (excludeCurrentUser && currentUserPubkey) {
      filtered = filtered.filter(
        (p: Profile) => p.pubkey !== currentUserPubkey,
      );
    }

    // Exclude specified pubkeys
    if (excludePubkeys.length > 0) {
      filtered = filtered.filter(
        (p: Profile) => !excludePubkeys.includes(p.pubkey),
      );
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const searchLower = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((profile: Profile) => {
        const name = profile.name?.toLowerCase() || "";
        const displayName = profile.display_name?.toLowerCase() || "";
        const pubkey = profile.pubkey.toLowerCase();

        return (
          name.includes(searchLower) ||
          displayName.includes(searchLower) ||
          pubkey.includes(searchLower)
        );
      });

      // Sort by relevance: exact matches first, then startsWith, then includes
      filtered.sort((a: Profile, b: Profile) => {
        const aName = (a.name || a.display_name || "").toLowerCase();
        const bName = (b.name || b.display_name || "").toLowerCase();

        // Exact matches first
        if (aName === searchLower && bName !== searchLower) return -1;
        if (bName === searchLower && aName !== searchLower) return 1;

        // StartsWith matches second
        if (aName.startsWith(searchLower) && !bName.startsWith(searchLower))
          return -1;
        if (bName.startsWith(searchLower) && !aName.startsWith(searchLower))
          return 1;

        // Alphabetical fallback
        return aName.localeCompare(bName);
      });
    }

    return filtered;
  }, [
    profiles,
    searchQuery,
    currentUserPubkey,
    excludeCurrentUser,
    excludePubkeys,
  ]);

  // Get selected profiles
  const selectedProfiles = useMemo(() => {
    return profiles.filter((p: Profile) => selectedPubkeys.includes(p.pubkey));
  }, [profiles, selectedPubkeys]);

  // Get available profiles (filtered but not selected)
  const availableProfiles = useMemo(() => {
    return filteredProfiles.filter(
      (p: Profile) => !selectedPubkeys.includes(p.pubkey),
    );
  }, [filteredProfiles, selectedPubkeys]);

  const addProfile = (profile: Profile) => {
    if (!selectedPubkeys.includes(profile.pubkey)) {
      setSelectedPubkeys((prev) => [...prev, profile.pubkey]);
    }
  };

  const removeProfile = (pubkey: string) => {
    setSelectedPubkeys((prev) => prev.filter((p) => p !== pubkey));
  };

  const clearSelection = () => {
    setSelectedPubkeys([]);
  };

  const isSelected = (pubkey: string) => {
    return selectedPubkeys.includes(pubkey);
  };

  return {
    searchQuery,
    setSearchQuery,
    filteredProfiles,
    selectedProfiles,
    availableProfiles,
    addProfile,
    removeProfile,
    clearSelection,
    isSelected,
  };
}

/**
 * Get display name for a profile
 */
export function getProfileDisplayName(profile: Profile): string {
  return (
    profile.name || profile.display_name || `${profile.pubkey.slice(0, 8)}...`
  );
}

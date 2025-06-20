import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { NDKKind } from "@nostr-dev-kit/ndk";
import { SupportedKinds } from "@/lib/constants/kinds";

interface UseFeedFiltersOptions {
  defaultKinds?: NDKKind[];
  defaultLive?: boolean;
}

export function useFeedFilters({
  defaultKinds = [NDKKind.Text],
  defaultLive = true,
}: UseFeedFiltersOptions = {}) {
  const [searchParams, setSearchParams] = useSearchParams({
    kinds: defaultKinds.map(String),
    live: defaultLive.toString(),
  });

  const urlKinds = searchParams
    .getAll("kinds")
    .map(Number)
    .filter((k) => SupportedKinds.includes(k));
  
  const urlLive = searchParams.get("live") === "true";

  const [kinds, setKinds] = useState<NDKKind[]>(
    urlKinds.length > 0 ? urlKinds : defaultKinds
  );
  const [tempKinds, setTempKinds] = useState<NDKKind[]>(kinds);
  const [live, setLive] = useState(urlLive);
  const [filterChanged, setFilterChanged] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  useEffect(() => {
    setTempKinds(kinds);
  }, [kinds]);

  useEffect(() => {
    const hasChanged =
      JSON.stringify(tempKinds.sort()) !== JSON.stringify(kinds.sort());
    setFilterChanged(hasChanged);
  }, [tempKinds, kinds]);

  const handleLiveChange = (checked: boolean) => {
    setLive(checked);
    setSearchParams(
      {
        kinds: kinds.map(String),
        live: checked.toString(),
      },
      {
        replace: true,
      }
    );
  };

  const handleKindToggle = (kind: NDKKind, checked: boolean) => {
    if (checked) {
      setTempKinds((prev) => [...prev, kind]);
    } else {
      setTempKinds((prev) => prev.filter((k) => k !== kind));
    }
  };

  const handleClearKinds = () => {
    setTempKinds([]);
  };

  const handleSelectAllKinds = () => {
    setTempKinds(SupportedKinds);
  };

  const handleSaveFilters = () => {
    setKinds(tempKinds);
    setIsPopoverOpen(false);
    setSearchParams(
      {
        kinds: tempKinds.map(String),
        live: live.toString(),
      },
      {
        replace: true,
      }
    );
  };

  const handleRemoveKind = (kind: NDKKind) => {
    const newKinds = kinds.filter(k => k !== kind);
    setKinds(newKinds);
    setTempKinds(newKinds);
    setSearchParams(
      {
        kinds: newKinds.map(String),
        live: live.toString(),
      },
      {
        replace: true,
      }
    );
  };

  return {
    kinds,
    tempKinds,
    live,
    filterChanged,
    isPopoverOpen,
    setIsPopoverOpen,
    handleLiveChange,
    handleKindToggle,
    handleClearKinds,
    handleSelectAllKinds,
    handleSaveFilters,
    handleRemoveKind,
  };
}
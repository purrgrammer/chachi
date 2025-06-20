import { useState, useEffect } from "react";
import { Filter, Radio } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ContentKinds, SupportedKinds } from "@/lib/constants/kinds";
import type { NDKKind } from "@nostr-dev-kit/ndk";

interface FeedControlsProps {
  kinds: NDKKind[];
  onKindsChange?: (kinds: NDKKind[]) => void;
  live: boolean;
  onLiveChange: (live: boolean) => void;
  supportedKinds?: NDKKind[];
  // External state management props (optional)
  tempKinds?: NDKKind[];
  filterChanged?: boolean;
  isPopoverOpen?: boolean;
  setIsPopoverOpen?: (open: boolean) => void;
  onKindToggle?: (kind: NDKKind, checked: boolean) => void;
  onClearKinds?: () => void;
  onSelectAllKinds?: () => void;
  onSaveFilters?: () => void;
}

export function FeedControls({
  kinds,
  onKindsChange,
  live,
  onLiveChange,
  supportedKinds = SupportedKinds,
  // External state props
  tempKinds: externalTempKinds,
  filterChanged: externalFilterChanged,
  isPopoverOpen: externalIsPopoverOpen,
  setIsPopoverOpen: externalSetIsPopoverOpen,
  onKindToggle,
  onClearKinds,
  onSelectAllKinds,
  onSaveFilters,
}: FeedControlsProps) {
  const { t } = useTranslation();
  
  // Use external state if provided, otherwise use internal state
  const [internalTempKinds, setInternalTempKinds] = useState<NDKKind[]>(kinds);
  const [internalFilterChanged, setInternalFilterChanged] = useState(false);
  const [internalIsPopoverOpen, setInternalIsPopoverOpen] = useState(false);

  const tempKinds = externalTempKinds ?? internalTempKinds;
  const filterChanged = externalFilterChanged ?? internalFilterChanged;
  const isPopoverOpen = externalIsPopoverOpen ?? internalIsPopoverOpen;
  const setIsPopoverOpen = externalSetIsPopoverOpen ?? setInternalIsPopoverOpen;

  useEffect(() => {
    if (!externalTempKinds) {
      setInternalTempKinds(kinds);
    }
  }, [kinds, externalTempKinds]);

  useEffect(() => {
    if (!externalFilterChanged) {
      const hasChanged =
        JSON.stringify(tempKinds.sort()) !== JSON.stringify(kinds.sort());
      setInternalFilterChanged(hasChanged);
    }
  }, [tempKinds, kinds, externalFilterChanged]);

  const handleKindToggle = (kind: NDKKind, checked: boolean) => {
    if (onKindToggle) {
      onKindToggle(kind, checked);
    } else {
      if (checked) {
        setInternalTempKinds((prev) => [...prev, kind]);
      } else {
        setInternalTempKinds((prev) => prev.filter((k) => k !== kind));
      }
    }
  };

  const handleClearKinds = () => {
    if (onClearKinds) {
      onClearKinds();
    } else {
      setInternalTempKinds([]);
    }
  };

  const handleSelectAllKinds = () => {
    if (onSelectAllKinds) {
      onSelectAllKinds();
    } else {
      setInternalTempKinds(supportedKinds);
    }
  };

  const handleSaveFilters = () => {
    if (onSaveFilters) {
      onSaveFilters();
    } else if (onKindsChange) {
      onKindsChange(tempKinds);
      setIsPopoverOpen(false);
    }
  };

  const availableKinds = ContentKinds.filter((kindInfo) =>
    supportedKinds.includes(kindInfo.kind)
  );

  return (
    <div className="flex flex-row gap-4 items-start justify-between pt-2 w-full px-4 sm:px-8">
      <div>
        <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Filter className="size-4" />
              {kinds.length > 0 && (
                <Badge variant="counter" className="ml-1">
                  {kinds.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <h4 className="font-medium">{t("feed.content-types")}</h4>
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    size="tiny"
                    onClick={handleClearKinds}
                  >
                    {t("feed.clear")}
                  </Button>
                  <Button
                    variant="outline"
                    size="tiny"
                    onClick={handleSelectAllKinds}
                  >
                    {t("feed.select-all")}
                  </Button>
                </div>
              </div>
              <ScrollArea className="h-[300px] pr-3">
                <div className="space-y-3">
                  {availableKinds.map((kindInfo) => (
                    <div
                      key={kindInfo.kind}
                      className="flex items-center space-x-2"
                    >
                      <Checkbox
                        id={`kind-${kindInfo.kind}`}
                        checked={tempKinds.includes(kindInfo.kind)}
                        onCheckedChange={(checked) =>
                          handleKindToggle(kindInfo.kind, checked as boolean)
                        }
                      />
                      <Label
                        htmlFor={`kind-${kindInfo.kind}`}
                        className="flex items-center gap-2 text-sm font-normal cursor-pointer"
                      >
                        {kindInfo.icon}
                        {t(kindInfo.translationKey)}
                      </Label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <div className="flex justify-end">
                <Button
                  onClick={handleSaveFilters}
                  size="sm"
                  disabled={!filterChanged}
                >
                  {t("feed.apply-filters")}
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
      <div className="flex items-center space-x-2">
        <Tooltip>
          <TooltipTrigger>
            <Radio className="size-4 text-muted-foreground" />
          </TooltipTrigger>
          <TooltipContent>
            {live ? t("feed.live-on") : t("feed.live-off")}
          </TooltipContent>
        </Tooltip>
        <Switch checked={live} onCheckedChange={onLiveChange} />
      </div>
    </div>
  );
}

interface ActiveFilterBadgesProps {
  kinds: NDKKind[];
  onRemoveKind: (kind: NDKKind) => void;
}

export function ActiveFilterBadges({ kinds, onRemoveKind }: ActiveFilterBadgesProps) {
  const { t } = useTranslation();

  if (kinds.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 px-4 sm:px-8 pt-2">
      {kinds.map((kind) => {
        const kindInfo = ContentKinds.find((k) => k.kind === kind);
        if (!kindInfo) return null;

        return (
          <Badge
            key={kind}
            variant="outline"
            className="flex items-center gap-1 cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
            onClick={() => onRemoveKind(kind)}
          >
            {kindInfo.icon}
            {t(kindInfo.translationKey)}
          </Badge>
        );
      })}
    </div>
  );
}
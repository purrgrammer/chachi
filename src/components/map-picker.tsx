import { useEffect, useState } from "react";
import { Map, Marker, ZoomControl } from "pigeon-maps";
import { osm } from "pigeon-maps/providers";
import Geohash from "latlon-geohash";
import { Search } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface MapPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (geohash: string) => void;
  initialGeohash?: string;
}

interface SearchResult {
  lat: string;
  lon: string;
  display_name: string;
}

type Point = [number, number];

export function MapPicker({
  open,
  onOpenChange,
  onSelect,
  initialGeohash,
}: MapPickerProps) {
  const { t } = useTranslation();
  const [center, setCenter] = useState<Point>([51.505, -0.09]);
  const [zoom, setZoom] = useState<number>(3);
  const [markerPosition, setMarkerPosition] = useState<Point | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    if (open && initialGeohash) {
      try {
        const { lat, lon } = Geohash.decode(initialGeohash);
        const initialPoint: Point = [lat, lon];
        setCenter(initialPoint);
        setMarkerPosition(initialPoint);
        setZoom(13);
      } catch (error) {
        console.error("Invalid initial geohash:", error);
        setMarkerPosition(null);
      }
    } else if (open) {
      setCenter([51.505, -0.09]);
      setZoom(3);
      setMarkerPosition(null);
    }
  }, [open, initialGeohash]);

  function handleMapClick({ latLng }: { latLng: Point }) {
    setMarkerPosition(latLng);
  }

  function handleSelect() {
    if (markerPosition) {
      const [lat, lng] = markerPosition;
      const geohash = Geohash.encode(lat, lng, 9);
      onSelect(geohash);
      onOpenChange(false);
    } else {
      console.warn("Attempted to select with no position.");
    }
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearchError(null);

    if (!searchQuery.trim()) return;

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`,
      );
      if (!response.ok) {
        throw new Error(`Nominatim API error: ${response.statusText}`);
      }
      const results: SearchResult[] = await response.json();

      if (results.length > 0) {
        const { lat, lon } = results[0];
        const latNum = Number(lat);
        const lonNum = Number(lon);

        if (!isNaN(latNum) && !isNaN(lonNum)) {
          const position: Point = [latNum, lonNum];
          setCenter(position);
          setMarkerPosition(position);
          setZoom(13);
        } else {
          throw new Error("Invalid coordinates received from Nominatim");
        }
      } else {
        setMarkerPosition(null);
        setSearchError(
          t("community.edit.metadata.map_picker.location_not_found"),
        );
      }
    } catch (error) {
      console.error("Search error:", error);
      setMarkerPosition(null);
      setSearchError(t("community.edit.metadata.map_picker.search_error"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] w-[95vw] max-h-[90vh] overflow-y-auto flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {t("community.edit.metadata.map_picker.title")}
          </DialogTitle>
          <DialogDescription>
            {t("community.edit.metadata.map_picker.description")}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 flex-grow">
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                t("community.edit.metadata.map_picker.search_placeholder") ||
                "Search for location..."
              }
              className="flex-1"
              aria-label={
                t("community.edit.metadata.map_picker.search_placeholder") ||
                "Search for location"
              }
            />
            <Button
              type="submit"
              size="icon"
              aria-label={t("search.action") || "Search"}
            >
              <Search className="h-4 w-4" />
            </Button>
          </form>
          {searchError && (
            <p className="text-sm text-red-500" role="alert">
              {searchError}
            </p>
          )}
          <div className="w-full flex-grow h-[300px] md:h-auto rounded-md border overflow-hidden min-h-[250px]">
            <Map
              provider={osm}
              height={400}
              center={center}
              zoom={zoom}
              onBoundsChanged={({ center, zoom }) => {
                setCenter(center);
                setZoom(zoom);
              }}
              onClick={handleMapClick}
            >
              <ZoomControl />
              {markerPosition && (
                <Marker
                  width={30}
                  anchor={markerPosition}
                  color="hsl(var(--primary))"
                />
              )}
            </Map>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4 flex-shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("community.edit.cancel")}
          </Button>
          <Button onClick={handleSelect} disabled={!markerPosition}>
            {t("community.edit.metadata.map_picker.select")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import Geohash from "latlon-geohash";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "react-i18next";
import { Search } from "lucide-react";

// Import Leaflet CSS
import "leaflet/dist/leaflet.css";

// Fix Leaflet's default icon issue with React
const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

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

export function MapPicker({
  open,
  onOpenChange,
  onSelect,
  initialGeohash,
}: MapPickerProps) {
  const { t } = useTranslation();
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [selectedPosition, setSelectedPosition] = useState<
    [number, number] | null
  >(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchError, setSearchError] = useState<string | null>(null);

  // Initialize map when component mounts
  useEffect(() => {
    if (!open || !mapContainerRef.current) return;

    let map: L.Map | null = null;

    // Small delay to ensure the dialog is fully rendered
    setTimeout(() => {
      // Clean up previous map instance if exists
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      if (mapContainerRef.current) {
        // Create map
        map = L.map(mapContainerRef.current, {
          minZoom: 2,
          maxZoom: 19,
          zoomControl: true,
          scrollWheelZoom: true,
        }).setView([51.505, -0.09], 3);

        // Add OpenStreetMap tiles with direct HTTPS URLs
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(map);

        // Save map reference
        mapRef.current = map;

        // Set initial position if geohash is provided
        if (initialGeohash) {
          try {
            const { lat, lon } = Geohash.decode(initialGeohash);
            map.setView([lat, lon], 12);
            markerRef.current = L.marker([lat, lon], {
              icon: DefaultIcon,
            }).addTo(map);
            setSelectedPosition([lat, lon]);
          } catch (error) {
            console.error("Invalid geohash:", error);
          }
        }

        // Handle map click
        map.on("click", (e) => {
          const { lat, lng } = e.latlng;
          if (markerRef.current) {
            markerRef.current.setLatLng([lat, lng]);
          } else {
            markerRef.current = L.marker([lat, lng], {
              icon: DefaultIcon,
            }).addTo(map!);
          }
          setSelectedPosition([lat, lng]);
        });

        // Force a resize to ensure proper rendering
        window.dispatchEvent(new Event("resize"));
      }
    }, 300);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  }, [open, initialGeohash]);

  function handleSelect() {
    if (selectedPosition) {
      const [lat, lng] = selectedPosition;
      const geohash = Geohash.encode(lat, lng, 9); // 9 characters for ~5m precision
      onSelect(geohash);
      onOpenChange(false);
    }
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearchError(null);

    if (!searchQuery.trim() || !mapRef.current) return;

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`,
      );
      const results: SearchResult[] = await response.json();

      if (results.length > 0) {
        const { lat, lon } = results[0];
        const latNum = Number(lat);
        const lonNum = Number(lon);

        mapRef.current.setView([latNum, lonNum], 13);

        if (markerRef.current) {
          markerRef.current.setLatLng([latNum, lonNum]);
        } else {
          markerRef.current = L.marker([latNum, lonNum], {
            icon: DefaultIcon,
          }).addTo(mapRef.current);
        }

        setSelectedPosition([latNum, lonNum]);
      } else {
        setSearchError(
          t("community.edit.metadata.map_picker.location_not_found"),
        );
      }
    } catch (error) {
      console.error("Search error:", error);
      setSearchError(t("community.edit.metadata.map_picker.search_error"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {t("community.edit.metadata.map_picker.title")}
          </DialogTitle>
          <DialogDescription>
            {t("community.edit.metadata.map_picker.description")}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                t("community.edit.metadata.map_picker.search_placeholder") ||
                "Search for location..."
              }
              className="flex-1"
            />
            <Button type="submit" size="icon">
              <Search className="h-4 w-4" />
            </Button>
          </form>
          {searchError && <p className="text-sm text-red-500">{searchError}</p>}
          <div
            ref={mapContainerRef}
            className="w-full h-[40vh] md:h-[400px] rounded-md border"
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t("community.edit.cancel")}
            </Button>
            <Button onClick={handleSelect} disabled={!selectedPosition}>
              {t("community.edit.metadata.map_picker.select")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

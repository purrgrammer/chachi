import { useState, useEffect } from "react";
import { Map, Marker } from "pigeon-maps";
import { osm } from "pigeon-maps/providers";
import Geohash from "latlon-geohash";

// Define type for pigeon-maps center/anchor
type Point = [number, number];

interface PigeonMiniMapProps {
  geohash: string;
  height?: string;
  className?: string;
}

export function PigeonMiniMap({
  geohash,
  height = "150px",
  className = "",
}: PigeonMiniMapProps) {
  const [mapCenter, setMapCenter] = useState<Point | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const { lat, lon } = Geohash.decode(geohash);
      setMapCenter([lat, lon]);
      setMapError(null);
    } catch (error) {
      console.error("Invalid geohash for MiniMap:", error);
      setMapCenter(null);
      setMapError("Invalid coordinates");
    }
  }, [geohash]);

  if (mapError) {
    return (
      <div
        className={`w-full rounded-md border ${className} flex items-center justify-center text-muted-foreground bg-muted`}
        style={{ height }}
      >
        {mapError}
      </div>
    );
  }

  if (!mapCenter) {
    // Optional: Show a loading state or placeholder while decoding geohash
    return (
      <div
        className={`w-full rounded-md border ${className} flex items-center justify-center text-muted-foreground bg-muted animate-pulse`}
        style={{ height }}
      />
    );
  }

  // Calculate height number for pigeon-maps
  const mapHeight = parseInt(height, 10) || 150;

  return (
    <div
      className={`w-full rounded-md border overflow-hidden ${className}`}
      style={{ height }}
    >
      <Map
        provider={osm}
        height={mapHeight}
        center={mapCenter}
        zoom={13} // Fixed zoom level for minimap
        mouseEvents={false} // Disable interaction
        touchEvents={false}
      >
        <Marker width={30} anchor={mapCenter} color="hsl(var(--primary))" />
      </Map>
    </div>
  );
}

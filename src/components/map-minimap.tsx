import { useRef, useEffect } from "react";
import L from "leaflet";
import Geohash from "latlon-geohash";
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

interface MiniMapProps {
  geohash: string;
  height?: string;
  className?: string;
}

export function MiniMap({
  geohash,
  height = "150px",
  className = "",
}: MiniMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Create map
    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      scrollWheelZoom: false,
      dragging: false,
      attributionControl: false,
    });

    // Add OpenStreetMap tiles
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    try {
      const { lat, lon } = Geohash.decode(geohash);
      map.setView([lat, lon], 13);
      L.marker([lat, lon], { icon: DefaultIcon }).addTo(map);
    } catch (error) {
      console.error("Invalid geohash:", error);
    }

    return () => {
      map.remove();
    };
  }, [geohash]);

  return (
    <div
      ref={mapContainerRef}
      className={`w-full rounded-md border ${className}`}
      style={{ height }}
    />
  );
}

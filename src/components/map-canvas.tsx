"use client";

import { useEffect } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";

type GroupedLocation = {
  key: string;
  latitude: number;
  longitude: number;
  label?: string | null;
  imageCount: number;
};

type MapCanvasProps = {
  defaultCenter: [number, number];
  locations: GroupedLocation[];
  onSelectLocation: (locationKey: string) => void;
};

function createMarkerIcon(count: number) {
  return L.divIcon({
    className: "",
    html: `<div style="display:flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:9999px;background:#0f172a;color:white;font-size:12px;font-weight:700;border:2px solid rgba(255,255,255,0.75);box-shadow:0 16px 30px rgba(15,23,42,0.25)">${count}</div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20]
  });
}

function FitBounds({
  defaultCenter,
  locations
}: {
  defaultCenter: [number, number];
  locations: GroupedLocation[];
}) {
  const map = useMap();

  useEffect(() => {
    if (!locations.length) {
      map.setView(defaultCenter, 4);
      return;
    }

    if (locations.length === 1) {
      map.setView([locations[0].latitude, locations[0].longitude], 10);
      return;
    }

    const bounds = L.latLngBounds(
      locations.map((location) => [location.latitude, location.longitude] as [number, number])
    );
    map.fitBounds(bounds.pad(0.2));
  }, [defaultCenter, locations, map]);

  return null;
}

export function MapCanvas({
  defaultCenter,
  locations,
  onSelectLocation
}: MapCanvasProps) {
  const mapKey = locations.map((location) => location.key).join("|") || "empty";

  return (
    <MapContainer key={mapKey} center={defaultCenter} zoom={4} className="h-full w-full">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds defaultCenter={defaultCenter} locations={locations} />
      {locations.map((location) => (
        <Marker
          key={location.key}
          position={[location.latitude, location.longitude]}
          icon={createMarkerIcon(location.imageCount)}
          eventHandlers={{
            click: () => onSelectLocation(location.key)
          }}
        >
          <Popup>
            <div className="space-y-1">
              <p className="font-semibold">{location.label || "Pinned photos"}</p>
              <p>
                {location.imageCount} image{location.imageCount === 1 ? "" : "s"}
              </p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

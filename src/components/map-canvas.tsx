"use client";

import { useEffect, useRef } from "react";
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

function buildPopupContent(location: GroupedLocation) {
  const wrapper = document.createElement("div");
  wrapper.className = "space-y-1";

  const title = document.createElement("p");
  title.className = "font-semibold";
  title.textContent = location.label || "Pinned photos";

  const count = document.createElement("p");
  count.textContent = `${location.imageCount} image${location.imageCount === 1 ? "" : "s"}`;

  wrapper.append(title, count);
  return wrapper;
}

export function MapCanvas({
  defaultCenter,
  locations,
  onSelectLocation
}: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerLayerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    const container = containerRef.current;

    if (!container || mapRef.current) {
      return;
    }

    delete (container as HTMLDivElement & { _leaflet_id?: number })._leaflet_id;

    const map = L.map(container, {
      center: defaultCenter,
      zoom: 4,
      zoomControl: true
    });

    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    const markerLayer = L.layerGroup().addTo(map);
    markerLayerRef.current = markerLayer;

    requestAnimationFrame(() => {
      map.invalidateSize();
    });

    return () => {
      markerLayer.clearLayers();
      map.remove();
      markerLayerRef.current = null;
      mapRef.current = null;
      delete (container as HTMLDivElement & { _leaflet_id?: number })._leaflet_id;
    };
  }, [defaultCenter]);

  useEffect(() => {
    const map = mapRef.current;
    const markerLayer = markerLayerRef.current;

    if (!map || !markerLayer) {
      return;
    }

    markerLayer.clearLayers();

    if (!locations.length) {
      map.setView(defaultCenter, 4);
      return;
    }

    const bounds = L.latLngBounds([]);

    for (const location of locations) {
      const marker = L.marker([location.latitude, location.longitude], {
        icon: createMarkerIcon(location.imageCount)
      });

      marker.on("click", () => onSelectLocation(location.key));
      marker.bindPopup(buildPopupContent(location));
      marker.addTo(markerLayer);
      bounds.extend([location.latitude, location.longitude]);
    }

    if (locations.length === 1) {
      map.setView([locations[0].latitude, locations[0].longitude], 10);
      return;
    }

    map.fitBounds(bounds.pad(0.2));
  }, [defaultCenter, locations, onSelectLocation]);

  return <div ref={containerRef} className="h-full w-full bg-slate-950/5" />;
}

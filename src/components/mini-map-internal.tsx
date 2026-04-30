"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";

type MiniMapInternalProps = {
  latitude: number | null;
  longitude: number | null;
  onLocationChange: (lat: number, lng: number) => void;
  height?: number;
};

const DEFAULT_CENTER: [number, number] = [31.2304, 121.4737];

function createPinIcon() {
  return L.divIcon({
    className: "image-detail-map-pin",
    iconSize: [22, 22],
    iconAnchor: [11, 20],
    html: `
      <span style="
        position: relative;
        display: block;
        width: 18px;
        height: 18px;
        border-radius: 18px 18px 18px 2px;
        transform: rotate(-45deg);
        background: #ef4444;
        border: 2px solid rgba(255,255,255,0.96);
        box-shadow: 0 10px 24px rgba(0,0,0,0.35);
      ">
        <span style="
          position: absolute;
          left: 4px;
          top: 4px;
          width: 6px;
          height: 6px;
          border-radius: 9999px;
          background: white;
        "></span>
      </span>
    `
  });
}

export function MiniMapInternal({
  latitude,
  longitude,
  onLocationChange,
  height = 200
}: MiniMapInternalProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const onLocationChangeRef = useRef(onLocationChange);

  onLocationChangeRef.current = onLocationChange;

  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) {
      return;
    }

    delete (container as HTMLDivElement & { _leaflet_id?: number })._leaflet_id;

    const hasLocation = latitude !== null && longitude !== null;
    const center: [number, number] = hasLocation ? [latitude, longitude] : DEFAULT_CENTER;
    const zoom = hasLocation ? 12 : 4;

    const map = L.map(container, {
      center,
      zoom,
      zoomControl: true
    });

    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    map.on("click", (event: L.LeafletMouseEvent) => {
      const { lat, lng } = event.latlng;

      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      } else {
        const marker = L.marker([lat, lng], {
          draggable: true,
          icon: createPinIcon()
        }).addTo(map);

        marker.on("dragend", () => {
          const position = marker.getLatLng();
          onLocationChangeRef.current(position.lat, position.lng);
        });

        markerRef.current = marker;
      }

      onLocationChangeRef.current(lat, lng);
    });

    requestAnimationFrame(() => {
      map.invalidateSize();
    });

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
      delete (container as HTMLDivElement & { _leaflet_id?: number })._leaflet_id;
    };
  }, [latitude, longitude]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    if (latitude !== null && longitude !== null) {
      if (markerRef.current) {
        markerRef.current.setLatLng([latitude, longitude]);
      } else {
        const marker = L.marker([latitude, longitude], {
          draggable: true,
          icon: createPinIcon()
        }).addTo(map);

        marker.on("dragend", () => {
          const position = marker.getLatLng();
          onLocationChangeRef.current(position.lat, position.lng);
        });

        markerRef.current = marker;
      }

      map.setView([latitude, longitude], Math.max(map.getZoom(), 10));
      return;
    }

    if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }

    map.setView(DEFAULT_CENTER, 4);
  }, [latitude, longitude]);

  return (
    <div
      ref={containerRef}
      className="w-full overflow-hidden rounded-lg border border-white/10"
      style={{ height }}
    />
  );
}

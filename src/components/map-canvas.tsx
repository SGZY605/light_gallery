"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";

export type MapMarkerImage = {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  thumbnailUrl: string;
};

const THUMBNAIL_MARKER_SIZE = 51;
const THUMBNAIL_MARKER_ANCHOR = THUMBNAIL_MARKER_SIZE / 2;

type MapCanvasProps = {
  defaultCenter: [number, number];
  images: MapMarkerImage[];
  onSelectImage: (imageId: string) => void;
};

function createThumbnailIcon(image: MapMarkerImage) {
  const safeUrl = image.thumbnailUrl.replace(/"/g, "%22");

  return L.divIcon({
    className: "",
    html: `<div style="width:${THUMBNAIL_MARKER_SIZE}px;height:${THUMBNAIL_MARKER_SIZE}px;overflow:hidden;border:2px solid rgba(255,255,255,0.9);background:#0f172a;box-shadow:0 10px 24px rgba(15,23,42,0.35)"><img src="${safeUrl}" alt="" style="width:100%;height:100%;object-fit:cover;display:block" /></div>`,
    iconSize: [THUMBNAIL_MARKER_SIZE, THUMBNAIL_MARKER_SIZE],
    iconAnchor: [THUMBNAIL_MARKER_ANCHOR, THUMBNAIL_MARKER_ANCHOR]
  });
}

export function MapCanvas({ defaultCenter, images, onSelectImage }: MapCanvasProps) {
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

    if (!images.length) {
      map.setView(defaultCenter, 4);
      return;
    }

    const bounds = L.latLngBounds([]);

    for (const image of images) {
      const marker = L.marker([image.latitude, image.longitude], {
        icon: createThumbnailIcon(image)
      });

      marker.on("click", () => onSelectImage(image.id));
      marker.addTo(markerLayer);
      bounds.extend([image.latitude, image.longitude]);
    }

    if (images.length === 1) {
      map.setView([images[0].latitude, images[0].longitude], 10);
      return;
    }

    map.fitBounds(bounds.pad(0.2));
  }, [defaultCenter, images, onSelectImage]);

  return <div ref={containerRef} className="h-full w-full bg-surface" />;
}

"use client";

import { useEffect, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import { LocationEditor } from "@/components/location-editor";
import { buildOssImageUrl } from "@/lib/oss/urls";

type MapImage = {
  id: string;
  objectKey: string;
  filename: string;
  createdAt: string;
  takenAt?: string | null;
  tags: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
  effectiveLocation: {
    latitude: number;
    longitude: number;
    label?: string | null;
    source: "manual" | "exif";
  };
  exifLocation?: {
    latitude?: number | null;
    longitude?: number | null;
  } | null;
  overrideLocation?: {
    latitude: number;
    longitude: number;
    label?: string | null;
  } | null;
};

type MapExplorerProps = {
  availableTags: Array<{
    id: string;
    name: string;
  }>;
  images: MapImage[];
};

type GroupedLocation = {
  key: string;
  latitude: number;
  longitude: number;
  label?: string | null;
  images: MapImage[];
};

const defaultCenter: [number, number] = [31.2304, 121.4737];

function groupImagesByLocation(images: MapImage[]): GroupedLocation[] {
  const groups = new Map<string, GroupedLocation>();

  for (const image of images) {
    const key = [
      image.effectiveLocation.latitude.toFixed(5),
      image.effectiveLocation.longitude.toFixed(5),
      image.effectiveLocation.label ?? ""
    ].join(":");
    const existing = groups.get(key);

    if (existing) {
      existing.images.push(image);
      continue;
    }

    groups.set(key, {
      key,
      latitude: image.effectiveLocation.latitude,
      longitude: image.effectiveLocation.longitude,
      label: image.effectiveLocation.label,
      images: [image]
    });
  }

  return Array.from(groups.values());
}

function createMarkerIcon(count: number) {
  return L.divIcon({
    className: "",
    html: `<div style="display:flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:9999px;background:#0f172a;color:white;font-size:12px;font-weight:700;border:2px solid rgba(255,255,255,0.75);box-shadow:0 16px 30px rgba(15,23,42,0.25)">${count}</div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20]
  });
}

function FitBounds({ locations }: { locations: GroupedLocation[] }) {
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

    const bounds = L.latLngBounds(locations.map((location) => [location.latitude, location.longitude] as [number, number]));
    map.fitBounds(bounds.pad(0.2));
  }, [locations, map]);

  return null;
}

export function MapExplorer({ availableTags, images }: MapExplorerProps) {
  const [selectedTagId, setSelectedTagId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const filteredImages = images.filter((image) => {
    if (selectedTagId && !image.tags.some((tag) => tag.id === selectedTagId)) {
      return false;
    }

    const comparisonDate = image.takenAt ?? image.createdAt;

    if (fromDate && comparisonDate < fromDate) {
      return false;
    }

    if (toDate && comparisonDate > `${toDate}T23:59:59`) {
      return false;
    }

    return true;
  });
  const groupedLocations = groupImagesByLocation(filteredImages);
  const [selectedLocationKey, setSelectedLocationKey] = useState<string | null>(groupedLocations[0]?.key ?? null);
  const selectedLocation =
    groupedLocations.find((location) => location.key === selectedLocationKey) ?? groupedLocations[0] ?? null;

  useEffect(() => {
    setSelectedLocationKey((currentKey) =>
      currentKey && groupedLocations.some((location) => location.key === currentKey)
        ? currentKey
        : groupedLocations[0]?.key ?? null
    );
  }, [groupedLocations]);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)] lg:grid-cols-[minmax(0,1fr)_180px_180px]">
        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Tag filter</span>
          <select
            value={selectedTagId}
            onChange={(event) => setSelectedTagId(event.target.value)}
            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
          >
            <option value="">All tags</option>
            {availableTags.map((tag) => (
              <option key={tag.id} value={tag.id}>
                {tag.name}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">From date</span>
          <input
            value={fromDate}
            onChange={(event) => setFromDate(event.target.value)}
            type="date"
            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
          />
        </label>

        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">To date</span>
          <input
            value={toDate}
            onChange={(event) => setToDate(event.target.value)}
            type="date"
            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
          />
        </label>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_420px]">
        <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white p-3 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
          <div className="h-[620px] overflow-hidden rounded-[28px]">
            <MapContainer center={defaultCenter} zoom={4} className="h-full w-full">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <FitBounds locations={groupedLocations} />
              {groupedLocations.map((location) => (
                <Marker
                  key={location.key}
                  position={[location.latitude, location.longitude]}
                  icon={createMarkerIcon(location.images.length)}
                  eventHandlers={{
                    click: () => setSelectedLocationKey(location.key)
                  }}
                >
                  <Popup>
                    <div className="space-y-1">
                      <p className="font-semibold">{location.label || "Pinned photos"}</p>
                      <p>{location.images.length} image{location.images.length === 1 ? "" : "s"}</p>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </section>

        <aside className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
          <div className="border-b border-slate-200 pb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-400">Location panel</p>
            <h3 className="mt-2 text-2xl font-semibold text-slate-950">
              {selectedLocation?.label || "Selected location"}
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              {selectedLocation
                ? `${selectedLocation.latitude.toFixed(5)}, ${selectedLocation.longitude.toFixed(5)}`
                : "Select a marker to inspect the images stored there."}
            </p>
          </div>

          <div className="mt-5 space-y-4">
            {selectedLocation ? (
              selectedLocation.images.map((image) => (
                <article
                  key={image.id}
                  className="space-y-4 rounded-[28px] border border-slate-200 bg-slate-50 p-4"
                >
                  <div
                    className="aspect-[4/3] rounded-[24px] bg-slate-200 bg-cover bg-center"
                    style={{ backgroundImage: `url("${buildOssImageUrl(image.objectKey, "thumb")}")` }}
                  />

                  <div>
                    <h4 className="font-semibold text-slate-950">{image.filename}</h4>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">
                      Source: {image.effectiveLocation.source === "manual" ? "Manual override" : "EXIF GPS"}
                    </p>
                  </div>

                  <LocationEditor
                    imageId={image.id}
                    fallbackLocation={
                      image.exifLocation?.latitude != null && image.exifLocation.longitude != null
                        ? {
                            latitude: image.exifLocation.latitude,
                            longitude: image.exifLocation.longitude,
                            label: null
                          }
                        : null
                    }
                    overrideLocation={image.overrideLocation}
                  />
                </article>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-12 text-center text-sm text-slate-500">
                No geotagged images match the current filters.
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

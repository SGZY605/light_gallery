"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
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
  publicBaseUrl: string;
};

type GroupedLocation = {
  key: string;
  latitude: number;
  longitude: number;
  label?: string | null;
  images: MapImage[];
};

const defaultCenter: [number, number] = [31.2304, 121.4737];
const LazyMapCanvas = dynamic(
  () => import("@/components/map-canvas").then((module) => module.MapCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center bg-slate-50 text-sm text-slate-500">
        正在加载地图...
      </div>
    )
  }
);

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

export function MapExplorer({ availableTags, images, publicBaseUrl }: MapExplorerProps) {
  const [isMapReady, setIsMapReady] = useState(false);
  const [selectedTagId, setSelectedTagId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  useEffect(() => {
    setIsMapReady(true);
  }, []);

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
  const groupedLocations = useMemo(() => groupImagesByLocation(filteredImages), [filteredImages]);
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
          <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">标签筛选</span>
          <select
            value={selectedTagId}
            onChange={(event) => setSelectedTagId(event.target.value)}
            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
          >
            <option value="">全部标签</option>
            {availableTags.map((tag) => (
              <option key={tag.id} value={tag.id}>
                {tag.name}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">开始日期</span>
          <input
            value={fromDate}
            onChange={(event) => setFromDate(event.target.value)}
            type="date"
            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
          />
        </label>

        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">结束日期</span>
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
            {isMapReady ? (
              <LazyMapCanvas
                defaultCenter={defaultCenter}
                locations={groupedLocations.map((location) => ({
                  key: location.key,
                  latitude: location.latitude,
                  longitude: location.longitude,
                  label: location.label,
                  imageCount: location.images.length
                }))}
                onSelectLocation={setSelectedLocationKey}
              />
            ) : (
              <div className="flex h-full items-center justify-center bg-slate-50 text-sm text-slate-500">
                正在加载地图...
              </div>
            )}
          </div>
        </section>

        <aside className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
          <div className="border-b border-slate-200 pb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-400">位置面板</p>
            <h3 className="mt-2 text-2xl font-semibold text-slate-950">
              {selectedLocation?.label || "已选位置"}
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              {selectedLocation
                ? `${selectedLocation.latitude.toFixed(5)}, ${selectedLocation.longitude.toFixed(5)}`
                : "选择一个标记即可查看该位置的图片。"}
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
                    style={{ backgroundImage: `url("${buildOssImageUrl(image.objectKey, "thumb", { publicBaseUrl })}")` }}
                  />

                  <div>
                    <h4 className="font-semibold text-slate-950">{image.filename}</h4>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">
                      来源：{image.effectiveLocation.source === "manual" ? "手动覆盖" : "EXIF GPS"}
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
                当前筛选条件下没有带地理位置的图片。
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

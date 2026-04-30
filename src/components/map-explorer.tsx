"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { buildOssImageUrl } from "@/lib/oss/urls";
import type { MapMarkerImage } from "@/components/map-canvas";

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
};

type MapExplorerProps = {
  images: MapImage[];
  publicBaseUrl: string;
};

const defaultCenter: [number, number] = [31.2304, 121.4737];

const ClientMapCanvas = dynamic(
  () => import("@/components/map-canvas").then((module) => module.MapCanvas),
  {
    ssr: false,
    loading: () => <div className="h-full w-full bg-surface" />
  }
);

function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return "未记录";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function offsetOverlappingMarkers(images: MapImage[], publicBaseUrl: string): MapMarkerImage[] {
  const locationCounts = new Map<string, number>();

  return images.map((image) => {
    const key = [
      image.effectiveLocation.latitude.toFixed(5),
      image.effectiveLocation.longitude.toFixed(5)
    ].join(":");
    const index = locationCounts.get(key) ?? 0;
    locationCounts.set(key, index + 1);
    const offset = index * 0.00008;

    return {
      id: image.id,
      title: image.filename,
      latitude: image.effectiveLocation.latitude + offset,
      longitude: image.effectiveLocation.longitude + offset,
      thumbnailUrl: buildOssImageUrl(image.objectKey, "thumb", { publicBaseUrl })
    };
  });
}

function MetadataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[88px_minmax(0,1fr)] gap-3 border-b border-border py-2 text-xs">
      <span className="text-[color:var(--text-faint)]">{label}</span>
      <span className="min-w-0 break-words text-[color:var(--text-secondary)]">{value}</span>
    </div>
  );
}

export function MapExplorer({ images, publicBaseUrl }: MapExplorerProps) {
  const router = useRouter();
  const markers = useMemo(() => offsetOverlappingMarkers(images, publicBaseUrl), [images, publicBaseUrl]);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(images[0]?.id ?? null);
  const selectedImage =
    images.find((image) => image.id === selectedImageId) ?? images[0] ?? null;

  useEffect(() => {
    setSelectedImageId((currentId) =>
      currentId && images.some((image) => image.id === currentId) ? currentId : images[0]?.id ?? null
    );
  }, [images]);

  const openSelectedImage = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      if (!selectedImage) {
        return;
      }

      const rect = event.currentTarget.getBoundingClientRect();

      try {
        sessionStorage.setItem(
          `image-rect-${selectedImage.id}`,
          JSON.stringify({
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height
          })
        );
        sessionStorage.setItem("image-detail-return-url", "/dashboard/map");
      } catch {
        // Detail navigation still works if sessionStorage is unavailable.
      }

      router.push(`/dashboard/library/${selectedImage.id}`);
    },
    [router, selectedImage]
  );

  return (
    <div className="grid min-h-0 gap-4 xl:grid-cols-[minmax(0,1fr)_400px]">
      <section className="min-h-0 overflow-hidden rounded-md border border-border bg-card p-2 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
        <div className="h-[calc(100vh-8rem)] min-h-[420px] overflow-hidden rounded-md">
          <ClientMapCanvas
            defaultCenter={defaultCenter}
            images={markers}
            onSelectImage={setSelectedImageId}
          />
        </div>
      </section>

      <aside className="min-h-0 rounded-md border border-border bg-card p-5 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
        <div className="border-b border-border pb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[color:var(--text-faint)]">
            位置面板
          </p>
          <h3 className="mt-2 text-xl font-semibold text-[color:var(--text-primary)]">
            {selectedImage?.filename ?? "暂无地理标记图片"}
          </h3>
          <p className="mt-2 text-sm text-[color:var(--text-secondary)]">
            {selectedImage
              ? `${selectedImage.effectiveLocation.latitude.toFixed(5)}, ${selectedImage.effectiveLocation.longitude.toFixed(5)}`
              : "图库中没有可展示在地图上的图片。"}
          </p>
        </div>

        {selectedImage ? (
          <div className="mt-5 space-y-4">
            <button
              type="button"
              onClick={openSelectedImage}
              className="group aspect-square w-full overflow-hidden rounded-md border border-border bg-surface focus:outline-none focus:ring-2 focus:ring-[color:var(--text-muted)]"
            >
              <img
                src={buildOssImageUrl(selectedImage.objectKey, "thumb", { publicBaseUrl })}
                alt={selectedImage.filename}
                className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.03] group-hover:opacity-85"
              />
            </button>

            <div>
              <MetadataRow label="文件名" value={selectedImage.filename} />
              <MetadataRow label="拍摄时间" value={formatDateTime(selectedImage.takenAt)} />
              <MetadataRow label="上传时间" value={formatDateTime(selectedImage.createdAt)} />
              <MetadataRow
                label="标签"
                value={selectedImage.tags.map((tag) => tag.name).join("、") || "未标记"}
              />
              <MetadataRow
                label="坐标来源"
                value={selectedImage.effectiveLocation.source === "manual" ? "手动覆盖" : "EXIF GPS"}
              />
              <MetadataRow
                label="纬度"
                value={selectedImage.effectiveLocation.latitude.toFixed(6)}
              />
              <MetadataRow
                label="经度"
                value={selectedImage.effectiveLocation.longitude.toFixed(6)}
              />
              <MetadataRow
                label="位置标签"
                value={selectedImage.effectiveLocation.label || "未设置"}
              />
            </div>
          </div>
        ) : (
          <div className="mt-5 rounded-md border border-dashed border-border px-6 py-12 text-center text-sm text-[color:var(--text-muted)]">
            没有可显示的地理标记图片。
          </div>
        )}
      </aside>
    </div>
  );
}

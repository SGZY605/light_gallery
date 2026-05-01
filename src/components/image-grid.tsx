"use client";

import { useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { clampLibraryColumnCount } from "@/lib/library/columns";
import { buildOssImageUrl } from "@/lib/oss/urls";

export type ImageGridImage = {
  id: string;
  objectKey: string;
  filename: string;
  description?: string | null;
  width?: number | null;
  height?: number | null;
  createdAt?: Date | string;
  tags: Array<{
    id: string;
    name: string;
    slug: string;
    color?: string | null;
  }>;
  exif?: {
    cameraMake?: string | null;
    cameraModel?: string | null;
    lensModel?: string | null;
    focalLength?: number | null;
    fNumber?: number | null;
    exposureTime?: string | null;
    iso?: number | null;
    takenAt?: Date | string | null;
  } | null;
};

export type ImageGridProps = {
  columnCount?: number;
  images: ImageGridImage[];
  emptyMessage?: string;
  publicBaseUrl: string;
};

function formatImageDimensions(width?: number | null, height?: number | null): string {
  if (!width || !height) {
    return "尺寸未知";
  }

  return `${width}×${height}px`;
}

export function ImageGrid({
  columnCount,
  images,
  emptyMessage = "没有匹配的图片。",
  publicBaseUrl
}: ImageGridProps) {
  const router = useRouter();
  const resolvedColumnCount = clampLibraryColumnCount(columnCount);

  const handleImageClick = useCallback(
    (index: number, event: React.MouseEvent<HTMLButtonElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();

      try {
        sessionStorage.setItem(
          `image-rect-${images[index].id}`,
          JSON.stringify({
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height
          })
        );
        sessionStorage.setItem(
          "image-detail-return-url",
          `${window.location.pathname}${window.location.search}`
        );
      } catch {
        // sessionStorage may be unavailable
      }

      router.push(`/dashboard/library/${images[index].id}`);
    },
    [images, router]
  );

  if (!images.length) {
    return (
      <div className="flex items-center justify-center px-6 py-24 text-sm text-[color:var(--text-muted)]">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="gap-0.5" style={{ columnCount: resolvedColumnCount }}>
      {images.map((image, index) => (
        <div key={image.id} className="mb-0.5 break-inside-avoid">
          <button
            type="button"
            className="group/image-tile relative block w-full cursor-pointer overflow-hidden border-0 bg-transparent p-0 text-left"
            onClick={(event) => handleImageClick(index, event)}
          >
            <Image
              src={buildOssImageUrl(image.objectKey, "thumb", { publicBaseUrl })}
              alt={image.filename}
              width={image.width ?? 480}
              height={image.height ?? 480}
              sizes={`${Math.ceil(100 / resolvedColumnCount)}vw`}
              unoptimized
              className="h-auto w-full transition duration-300 ease-out group-hover/image-tile:scale-[1.035]"
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-2 bg-gradient-to-t from-black/65 via-black/36 to-transparent px-3 pb-2 pt-10 opacity-0 transition duration-200 ease-out group-hover/image-tile:translate-y-0 group-hover/image-tile:opacity-100">
              <p className="gallery-hover-overlay-title truncate text-[11px] font-medium leading-4">
                {image.filename}
              </p>
              <p className="gallery-hover-overlay-meta text-[10px] leading-4">
                {formatImageDimensions(image.width, image.height)}
              </p>
            </div>
          </button>
        </div>
      ))}
    </div>
  );
}

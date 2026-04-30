"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { buildOssImageUrl } from "@/lib/oss/urls";

type ImageItem = {
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

type ImageGridProps = {
  images: ImageItem[];
  emptyMessage?: string;
  publicBaseUrl: string;
};

export function ImageGrid({
  images,
  emptyMessage = "没有匹配的图片",
  publicBaseUrl
}: ImageGridProps) {
  const router = useRouter();

  const handleImageClick = useCallback(
    (index: number, e: React.MouseEvent<HTMLImageElement>) => {
      const img = e.currentTarget;
      const rect = img.getBoundingClientRect();

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
        sessionStorage.setItem( "image-detail-return-url", `${window.location.pathname}${window.location.search}`);
      } catch {
        // sessionStorage may be unavailable
      }

      router.push(`/dashboard/library/${images[index].id}`);
    },
    [images, router]
  );

  // Empty state
  if (!images.length) {
    return (
      <div className="flex items-center justify-center px-6 py-24 text-sm text-[color:var(--text-muted)]">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="columns-2 md:columns-3 xl:columns-4 gap-0.5">
      {images.map((image, index) => (
        <div key={image.id} className="break-inside-avoid mb-0.5">
          <img
            src={buildOssImageUrl(image.objectKey, "thumb", { publicBaseUrl })}
            alt={image.filename}
            className="w-full h-auto cursor-pointer hover:opacity-80 transition-opacity"
            onClick={(e) => handleImageClick(index, e)}
          />
        </div>
      ))}
    </div>
  );
}

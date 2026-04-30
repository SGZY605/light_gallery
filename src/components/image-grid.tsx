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
            className="block w-full cursor-pointer border-0 bg-transparent p-0 text-left transition-opacity hover:opacity-80"
            onClick={(event) => handleImageClick(index, event)}
          >
            <Image
              src={buildOssImageUrl(image.objectKey, "thumb", { publicBaseUrl })}
              alt={image.filename}
              width={image.width ?? 480}
              height={image.height ?? 480}
              sizes={`${Math.ceil(100 / resolvedColumnCount)}vw`}
              unoptimized
              className="h-auto w-full"
            />
          </button>
        </div>
      ))}
    </div>
  );
}

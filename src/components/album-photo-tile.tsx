"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { buildOssImageUrl } from "@/lib/oss/urls";

type AlbumPhotoTileProps = {
  id: string;
  objectKey: string;
  filename: string;
  publicBaseUrl: string;
  className?: string;
};

export function AlbumPhotoTile({
  id,
  objectKey,
  filename,
  publicBaseUrl,
  className = ""
}: AlbumPhotoTileProps) {
  const router = useRouter();

  const handleOpen = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();

      try {
        sessionStorage.setItem(
          `image-rect-${id}`,
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
        // Detail navigation still works if sessionStorage is unavailable.
      }

      router.push(`/dashboard/library/${id}`);
    },
    [id, router]
  );

  return (
    <button
      type="button"
      onClick={handleOpen}
      className={[
        "group relative aspect-square overflow-hidden rounded-md border border-border bg-surface",
        "focus:outline-none focus:ring-2 focus:ring-[color:var(--text-muted)]",
        className
      ].join(" ")}
    >
      <img
        src={buildOssImageUrl(objectKey, "thumb", { publicBaseUrl })}
        alt={filename}
        className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.03] group-hover:opacity-85"
      />
    </button>
  );
}

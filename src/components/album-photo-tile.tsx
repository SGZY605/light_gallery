"use client";

import { useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { storeImageDetailReturnState } from "@/lib/images/detail-return";
import { buildOssImageUrl } from "@/lib/oss/urls";

type AlbumPhotoTileProps = {
  id: string;
  objectKey: string;
  filename: string;
  publicBaseUrl: string;
  className?: string;
  entryIndex?: number;
};

export function AlbumPhotoTile({
  id,
  objectKey,
  filename,
  publicBaseUrl,
  className = "",
  entryIndex = 0
}: AlbumPhotoTileProps) {
  const router = useRouter();

  const handleOpen = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();

      try {
        storeImageDetailReturnState(id, rect);
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
      style={{ "--entry-index": entryIndex } as React.CSSProperties}
      className={[
        "album-entry-tile group relative aspect-square overflow-hidden rounded-md border border-border bg-surface",
        "focus:outline-none focus:ring-2 focus:ring-[color:var(--text-muted)]",
        className
      ].join(" ")}
    >
      <Image
        src={buildOssImageUrl(objectKey, "thumb", { publicBaseUrl })}
        alt={filename}
        fill
        sizes="(min-width: 1536px) 12.5vw, (min-width: 1280px) 14vw, (min-width: 768px) 20vw, (min-width: 640px) 25vw, 33vw"
        unoptimized
        className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.03] group-hover:opacity-85"
      />
    </button>
  );
}

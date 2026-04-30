"use client";

import { useEffect, useRef, useState } from "react";
import { ImageGrid, type ImageGridImage } from "@/components/image-grid";
import { LibraryColumnControl } from "@/components/library-column-control";
import { LibraryFilterBar, type LibraryFilterTag } from "@/components/library-filter-bar";
import { clampLibraryColumnCount } from "@/lib/library/columns";

type LibraryPageShellProps = {
  images: ImageGridImage[];
  initialColumnCount: number;
  publicBaseUrl: string;
  query: string;
  selectedTagIds: string[];
  tags: LibraryFilterTag[];
};

export function LibraryPageShell({
  images,
  initialColumnCount,
  publicBaseUrl,
  query,
  selectedTagIds,
  tags
}: LibraryPageShellProps) {
  const [columnCount, setColumnCount] = useState(initialColumnCount);
  const initialColumnCountRef = useRef(initialColumnCount);

  useEffect(() => {
    if (columnCount === initialColumnCountRef.current) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void fetch("/api/users/library-preference", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          columnCount: clampLibraryColumnCount(columnCount)
        })
      }).catch(() => {
        // Preference persistence is best-effort and should not block the UI.
      });
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [columnCount]);

  return (
    <div className="space-y-4">
      <div className="sticky top-0 z-20 flex items-start justify-between gap-3 pb-2 pt-1">
        <LibraryColumnControl columnCount={columnCount} onColumnCountChange={setColumnCount} />
        <LibraryFilterBar query={query} selectedTagIds={selectedTagIds} tags={tags} />
      </div>

      <ImageGrid columnCount={columnCount} publicBaseUrl={publicBaseUrl} images={images} />
    </div>
  );
}

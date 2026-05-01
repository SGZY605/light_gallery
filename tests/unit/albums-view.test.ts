import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildMemoryHighlights,
  buildMemoryShareHref,
  findMemoryHighlightById,
  filterAlbumImages,
  getAlbumDisplayDate,
  groupImagesByTimelineDate,
  parseAlbumsView
} from "@/lib/albums/view";

const projectRoot = process.cwd();

function readProjectFile(path: string): string {
  return readFileSync(join(projectRoot, path), "utf8");
}

const images = [
  {
    id: "newer-upload",
    createdAt: "2026-04-12T08:00:00.000Z",
    takenAt: null,
    tags: [{ id: "family", name: "家庭", slug: "family" }]
  },
  {
    id: "older-capture",
    createdAt: "2026-04-20T08:00:00.000Z",
    takenAt: "2024-05-01T10:00:00.000Z",
    tags: [{ id: "travel", name: "旅行", slug: "travel" }]
  },
  {
    id: "newest-capture",
    createdAt: "2026-04-01T08:00:00.000Z",
    takenAt: "2026-04-18T12:30:00.000Z",
    tags: [
      { id: "family", name: "家庭", slug: "family" },
      { id: "travel", name: "旅行", slug: "travel" }
    ]
  }
];

describe("albums view helpers", () => {
  it("uses capture time first and upload time as display-date fallback", () => {
    expect(getAlbumDisplayDate(images[0]).toISOString()).toBe("2026-04-12T08:00:00.000Z");
    expect(getAlbumDisplayDate(images[1]).toISOString()).toBe("2024-05-01T10:00:00.000Z");
  });

  it("filters by multiple tags and display-date range", () => {
    const result = filterAlbumImages(images, {
      selectedTagIds: ["family", "travel"],
      fromDate: "2026-04-01",
      toDate: "2026-04-30"
    });

    expect(result.map((image) => image.id)).toEqual(["newest-capture"]);
  });

  it("groups timeline dates descending using upload time when capture time is missing", () => {
    const result = groupImagesByTimelineDate(images);

    expect(result.map((group) => group.dateKey)).toEqual([
      "2026-04-18",
      "2026-04-12",
      "2024-05-01"
    ]);
    expect(result[1].images.map((image) => image.id)).toEqual(["newer-upload"]);
  });

  it("parses invalid view values as filter", () => {
    expect(parseAlbumsView("timeline")).toBe("timeline");
    expect(parseAlbumsView("unknown")).toBe("filter");
    expect(parseAlbumsView(undefined)).toBe("filter");
  });

  it("builds warm memory highlights from anniversaries, dense months, and tags", () => {
    const result = buildMemoryHighlights(
      [
        ...images,
        {
          id: "anniversary-2024",
          createdAt: "2026-04-20T08:00:00.000Z",
          takenAt: "2024-05-01T09:00:00.000Z",
          tags: [{ id: "travel", name: "旅行", slug: "travel" }]
        },
        {
          id: "anniversary-2023",
          createdAt: "2026-04-20T08:00:00.000Z",
          takenAt: "2023-05-01T09:00:00.000Z",
          tags: [{ id: "family", name: "家庭", slug: "family" }]
        },
        {
          id: "april-extra",
          createdAt: "2026-04-17T08:00:00.000Z",
          takenAt: "2026-04-17T12:00:00.000Z",
          tags: [{ id: "family", name: "家庭", slug: "family" }]
        }
      ],
      new Date("2026-05-01T03:00:00.000Z")
    );

    expect(result.map((highlight) => highlight.kind)).toEqual(["anniversary", "month", "tag"]);
    expect(result[0].title).toBe("今天的往年");
    expect(result[0].images.map((image) => image.id)).toEqual([
      "older-capture",
      "anniversary-2024",
      "anniversary-2023"
    ]);
    expect(result[1].title).toBe("2026 年 4 月的光影");
    expect(result[1].imageIds).toEqual(["newest-capture", "april-extra", "newer-upload"]);
    expect(result[2].title).toBe("家庭的收藏");
  });

  it("limits each memory preview to ten deterministically shuffled images", () => {
    const manyAnniversaryImages = Array.from({ length: 14 }, (_, index) => ({
      id: `anniversary-${String(index).padStart(2, "0")}`,
      createdAt: `2026-04-${String(index + 1).padStart(2, "0")}T08:00:00.000Z`,
      takenAt: `2020-05-01T${String(index).padStart(2, "0")}:00:00.000Z`,
      tags: [{ id: "travel", name: "旅行", slug: "travel" }]
    }));

    const first = buildMemoryHighlights(manyAnniversaryImages, new Date("2026-05-01T03:00:00.000Z"));
    const second = buildMemoryHighlights(manyAnniversaryImages, new Date("2026-05-01T03:00:00.000Z"));

    expect(first[0].images).toHaveLength(14);
    expect(first[0].previewImages).toHaveLength(10);
    expect(first[0].previewImageIds).toEqual(first[0].previewImages.map((image) => image.id));
    expect(first[0].previewImageIds).toEqual(second[0].previewImageIds);
    expect(first[0].previewImageIds).not.toEqual(manyAnniversaryImages.slice(0, 10).map((image) => image.id));
  });

  it("builds a compact share composer link for a memory highlight", () => {
    const href = buildMemoryShareHref({
      title: "今天的往年",
      shareDescription: "把这几张照片寄给想念的人。",
      imageIds: ["image-1", "image-2", "image-3"]
    });

    expect(href).toBe(
      "/dashboard/shares?title=%E4%BB%8A%E5%A4%A9%E7%9A%84%E5%BE%80%E5%B9%B4&description=%E6%8A%8A%E8%BF%99%E5%87%A0%E5%BC%A0%E7%85%A7%E7%89%87%E5%AF%84%E7%BB%99%E6%83%B3%E5%BF%B5%E7%9A%84%E4%BA%BA%E3%80%82&imageId=image-1&imageId=image-2&imageId=image-3"
    );
  });

  it("finds a memory highlight by route id for the secondary memory page", () => {
    const result = findMemoryHighlightById(
      [
        ...images,
        {
          id: "anniversary-2024",
          createdAt: "2026-04-20T08:00:00.000Z",
          takenAt: "2024-05-01T09:00:00.000Z",
          tags: [{ id: "travel", name: "旅行", slug: "travel" }]
        }
      ],
      "anniversary-05-01",
      new Date("2026-05-01T03:00:00.000Z")
    );

    expect(result?.title).toBe("今天的往年");
    expect(result?.imageIds).toEqual(["older-capture", "anniversary-2024"]);
  });
});

describe("albums page source contracts", () => {
  it("creates the albums route with stats and browser data", () => {
    const source = readProjectFile("src/app/dashboard/albums/page.tsx");

    expect(source).toContain("AlbumsBrowser");
    expect(source).toContain("activeShareCount");
    expect(source).toContain("capturedImageCount");
    expect(source).toContain("resolveUserOssConfig");
  });

  it("uses square reusable album thumbnails that open the existing detail route", () => {
    const tileSource = readProjectFile("src/components/album-photo-tile.tsx");

    expect(tileSource).toContain("aspect-square");
    expect(tileSource).toContain("/dashboard/library/");
    expect(tileSource).toContain("image-detail-return-url");
  });

  it("adds soft staggered entry animation support to reusable album thumbnails", () => {
    const tileSource = readProjectFile("src/components/album-photo-tile.tsx");
    const styles = readProjectFile("src/app/globals.css");

    expect(tileSource).toContain("entryIndex = 0");
    expect(tileSource).toContain("album-entry-tile");
    expect(tileSource).toContain("--entry-index");
    expect(styles).toContain("@keyframes album-soft-entry");
    expect(styles).toContain(".album-entry-tile");
    expect(styles).toContain("animation-delay: min(calc(var(--entry-index, 0) * 46ms), 360ms)");
    expect(styles).toContain("@media (prefers-reduced-motion: reduce)");
    expect(styles).toContain(".album-entry-tile");
  });

  it("renders filter and timeline controls in the albums browser", () => {
    const browserSource = readProjectFile("src/components/albums-browser.tsx");

    expect(browserSource).toContain("筛选视图");
    expect(browserSource).toContain("时间线视图");
    expect(browserSource).toContain("groupImagesByTimelineDate");
    expect(browserSource).toContain("filterAlbumImages");
  });

  it("renders memory highlights with a secondary page share handoff", () => {
    const browserSource = readProjectFile("src/components/albums-browser.tsx");
    const sharesSource = readProjectFile("src/app/dashboard/shares/page.tsx");
    const selectorSource = readProjectFile("src/components/share-photo-selector.tsx");
    const memoryPageSource = readProjectFile("src/app/dashboard/albums/memories/[memoryId]/page.tsx");
    const favoritesPageSource = readProjectFile("src/app/dashboard/albums/favorites/page.tsx");

    expect(browserSource).toContain("回忆精选");
    expect(browserSource).toContain("buildMemoryHighlights");
    expect(browserSource).toContain("MemoryPhotoPreview");
    expect(browserSource).toContain("highlight.previewImages");
    expect(browserSource).toContain("previewImages.slice(1, 10)");
    expect(browserSource).toContain("grid-cols-3");
    expect(browserSource).toContain("/dashboard/albums/favorites");
    expect(browserSource).toContain("/dashboard/albums/memories/");
    expect(browserSource).toContain("favoriteImages");
    expect(browserSource).toContain("favoritePreviewImages");
    expect(browserSource).not.toContain("{memoryHighlights.length ? (");
    expect(browserSource).toContain("打开回忆");
    expect(browserSource).not.toContain("buildMemoryShareHref");
    expect(browserSource).not.toContain("带去分享");
    expect(sharesSource).toContain("initialSelectedImageIds");
    expect(selectorSource).toContain("initialSelectedImageIds");
    expect(selectorSource).toContain("selectedShareImages");
    expect(memoryPageSource).toContain("findMemoryHighlightById");
    expect(memoryPageSource).toContain("buildMemoryShareHref");
    expect(memoryPageSource).toContain("带去分享");
    expect(favoritesPageSource).toContain("featured: true");
    expect(favoritesPageSource).toContain("updatedAt: \"desc\"");
  });

  it("loads recent favorites for the albums overview card", () => {
    const pageSource = readProjectFile("src/app/dashboard/albums/page.tsx");

    expect(pageSource).toContain("favoriteImages");
    expect(pageSource).toContain("featured: true");
    expect(pageSource).toContain("updatedAt: \"desc\"");
    expect(pageSource).toContain("take: 10");
    expect(pageSource).toContain("favoriteImages={");
  });

  it("passes local entry indexes to album thumbnail lists", () => {
    const browserSource = readProjectFile("src/components/albums-browser.tsx");
    const favoritesPageSource = readProjectFile("src/app/dashboard/albums/favorites/page.tsx");
    const memoryPageSource = readProjectFile("src/app/dashboard/albums/memories/[memoryId]/page.tsx");

    expect(browserSource).toContain("entryIndex={0}");
    expect(browserSource).toContain("supportingImages.map((image, index)");
    expect(browserSource).toContain("entryIndex={index + 1}");
    expect(browserSource).toContain("filteredImages.map((image, index)");
    expect(browserSource).toContain("group.images.map((image, index)");
    expect(browserSource).toContain("entryIndex={index}");
    expect(favoritesPageSource).toContain("visibleImages.map((image, index)");
    expect(favoritesPageSource).toContain("entryIndex={index}");
    expect(memoryPageSource).toContain("memory.images.map((image, index)");
    expect(memoryPageSource).toContain("entryIndex={index}");
  });
});

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
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

  it("renders filter and timeline controls in the albums browser", () => {
    const browserSource = readProjectFile("src/components/albums-browser.tsx");

    expect(browserSource).toContain("筛选视图");
    expect(browserSource).toContain("时间线视图");
    expect(browserSource).toContain("groupImagesByTimelineDate");
    expect(browserSource).toContain("filterAlbumImages");
  });
});

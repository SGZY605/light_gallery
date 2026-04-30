# Dashboard Albums and Map Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the dashboard default to 图库, add a derived 相册 page with stats/filter/timeline views, and simplify the map into a thumbnail-based geospatial browser.

**Architecture:** Keep data model unchanged. Put albums date/filter/timeline rules in a pure helper module with unit tests, use focused client components for square thumbnails and interactive controls, and keep server pages responsible for Prisma queries and DTO normalization. Rework the existing map client and Leaflet canvas to select individual image markers instead of filtered location groups.

**Tech Stack:** Next.js App Router, React 18, TypeScript, Prisma, Tailwind CSS, Leaflet, Vitest, Playwright.

---

## File Structure

- Modify `src/components/dashboard-nav.tsx`: remove 首页, add 相册, reorder items.
- Modify `src/app/dashboard/page.tsx`: replace overview with redirect to `/dashboard/library`.
- Create `src/lib/albums/view.ts`: pure display-date, filter, stats DTO, and timeline grouping helpers.
- Create `tests/unit/albums-view.test.ts`: unit coverage for date fallback, filter behavior, timeline sorting, and query parsing.
- Create `src/components/album-photo-tile.tsx`: reusable square thumbnail tile that opens the existing detail route and stores return transition data.
- Create `src/components/albums-browser.tsx`: client UI for view toggle, filter controls, square grid, and timeline.
- Create `src/app/dashboard/albums/page.tsx`: server route that fetches stats, tags, images, and renders `AlbumsBrowser`.
- Modify `src/components/map-canvas.tsx`: accept image markers with thumbnail URLs and render tiny square Leaflet icons.
- Modify `src/components/map-explorer.tsx`: remove filters, select one image, show metadata panel, and open detail from panel thumbnail.
- Modify `src/app/dashboard/map/page.tsx`: stop fetching standalone tag filters, pass public base URL, and normalize images for per-image map markers.
- Add or update tests in `tests/unit/dashboard-navigation.test.ts`, `tests/unit/map-explorer-theme.test.ts`, and `tests/e2e/gallery.spec.ts`.

## Task 1: Navigation And Dashboard Redirect

**Files:**
- Modify: `src/components/dashboard-nav.tsx`
- Modify: `src/app/dashboard/page.tsx`
- Create: `tests/unit/dashboard-navigation.test.ts`
- Modify: `tests/unit/dashboard-shell-state.test.ts`

- [ ] **Step 1: Write failing navigation tests**

Create `tests/unit/dashboard-navigation.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = process.cwd();

function readProjectFile(path: string): string {
  return readFileSync(join(projectRoot, path), "utf8");
}

function extractNavigationLabels(source: string): string[] {
  return Array.from(source.matchAll(/label:\s*"([^"]+)"/g)).map((match) => match[1]);
}

describe("dashboard navigation", () => {
  it("renders the requested sidebar order without home", () => {
    const source = readProjectFile("src/components/dashboard-nav.tsx");

    expect(extractNavigationLabels(source)).toEqual([
      "图库",
      "相册",
      "地图",
      "标签",
      "上传",
      "分享",
      "用户",
      "设置"
    ]);
    expect(source).not.toContain("首页");
    expect(source).toContain('href: "/dashboard/albums"');
    expect(source).toContain("requiresManager: true");
  });

  it("redirects the dashboard root to the gallery", () => {
    const source = readProjectFile("src/app/dashboard/page.tsx");

    expect(source).toContain('redirect("/dashboard/library")');
    expect(source).not.toContain("db.image.count");
    expect(source).not.toContain("DashboardOverviewPage");
  });
});
```

- [ ] **Step 2: Run the failing navigation tests**

Run: `npm test -- tests/unit/dashboard-navigation.test.ts`

Expected: fail because the current navigation still includes 首页 and `/dashboard` still renders the overview.

- [ ] **Step 3: Implement navigation and redirect**

In `src/components/dashboard-nav.tsx`, remove the `LayoutDashboard` import and set `navigationItems` to:

```ts
const navigationItems: NavigationItem[] = [
  { href: "/dashboard/library", label: "图库", icon: Grid2x2 },
  { href: "/dashboard/albums", label: "相册", icon: Images },
  { href: "/dashboard/map", label: "地图", icon: MapPinned },
  { href: "/dashboard/tags", label: "标签", icon: Tags },
  { href: "/dashboard/upload", label: "上传", icon: UploadCloud },
  { href: "/dashboard/shares", label: "分享", icon: Share2 },
  { href: "/dashboard/users", label: "用户", icon: Users, requiresManager: true },
  { href: "/dashboard/settings", label: "设置", icon: Settings }
];
```

Add `Images` to the lucide import list.

Replace `src/app/dashboard/page.tsx` with:

```ts
import { redirect } from "next/navigation";

export default function DashboardPage() {
  redirect("/dashboard/library");
}
```

- [ ] **Step 4: Run tests**

Run: `npm test -- tests/unit/dashboard-navigation.test.ts tests/unit/dashboard-shell-state.test.ts`

Expected: pass. If `dashboard-shell-state.test.ts` has assertions about the old 首页 route, update it to keep only generic active-state helper assertions that are still true.

## Task 2: Albums Pure View Helpers

**Files:**
- Create: `src/lib/albums/view.ts`
- Create: `tests/unit/albums-view.test.ts`

- [ ] **Step 1: Write failing helper tests**

Create `tests/unit/albums-view.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  filterAlbumImages,
  getAlbumDisplayDate,
  groupImagesByTimelineDate,
  parseAlbumsView
} from "@/lib/albums/view";

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
```

- [ ] **Step 2: Run the failing helper tests**

Run: `npm test -- tests/unit/albums-view.test.ts`

Expected: fail because `src/lib/albums/view.ts` does not exist.

- [ ] **Step 3: Implement helper module**

Create `src/lib/albums/view.ts`:

```ts
export type AlbumsViewMode = "filter" | "timeline";

export type AlbumImageTag = {
  id: string;
  name: string;
  slug: string;
  color?: string | null;
};

export type AlbumImageLike = {
  id: string;
  createdAt: Date | string;
  takenAt?: Date | string | null;
  tags: AlbumImageTag[];
};

export type AlbumFilterState = {
  selectedTagIds: string[];
  fromDate?: string;
  toDate?: string;
};

export type TimelineGroup<T extends AlbumImageLike> = {
  dateKey: string;
  label: string;
  images: T[];
};

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

function isValidDateInput(value: string | undefined): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

export function parseAlbumsView(value: string | string[] | undefined): AlbumsViewMode {
  const singleValue = Array.isArray(value) ? value[0] : value;
  return singleValue === "timeline" ? "timeline" : "filter";
}

export function getAlbumDisplayDate(image: AlbumImageLike): Date {
  return image.takenAt ? toDate(image.takenAt) : toDate(image.createdAt);
}

export function getAlbumDateKey(image: AlbumImageLike): string {
  return getAlbumDisplayDate(image).toISOString().slice(0, 10);
}

export function filterAlbumImages<T extends AlbumImageLike>(
  images: T[],
  filters: AlbumFilterState
): T[] {
  const selectedTagIds = Array.from(new Set(filters.selectedTagIds.filter(Boolean)));
  const fromDate = isValidDateInput(filters.fromDate) ? filters.fromDate : "";
  const toDate = isValidDateInput(filters.toDate) ? filters.toDate : "";

  return images.filter((image) => {
    if (
      selectedTagIds.length &&
      !selectedTagIds.every((tagId) => image.tags.some((tag) => tag.id === tagId))
    ) {
      return false;
    }

    const dateKey = getAlbumDateKey(image);

    if (fromDate && dateKey < fromDate) {
      return false;
    }

    if (toDate && dateKey > toDate) {
      return false;
    }

    return true;
  });
}

export function groupImagesByTimelineDate<T extends AlbumImageLike>(images: T[]): TimelineGroup<T>[] {
  const groups = new Map<string, T[]>();
  const sortedImages = [...images].sort(
    (a, b) => getAlbumDisplayDate(b).getTime() - getAlbumDisplayDate(a).getTime()
  );

  for (const image of sortedImages) {
    const dateKey = getAlbumDateKey(image);
    groups.set(dateKey, [...(groups.get(dateKey) ?? []), image]);
  }

  return Array.from(groups.entries()).map(([dateKey, groupImages]) => ({
    dateKey,
    label: dateKey,
    images: groupImages
  }));
}
```

- [ ] **Step 4: Run helper tests**

Run: `npm test -- tests/unit/albums-view.test.ts`

Expected: pass.

## Task 3: Albums Page And Browser UI

**Files:**
- Create: `src/components/album-photo-tile.tsx`
- Create: `src/components/albums-browser.tsx`
- Create: `src/app/dashboard/albums/page.tsx`
- Modify: `tests/e2e/gallery.spec.ts`

- [ ] **Step 1: Write failing source tests for albums UI contracts**

Append to `tests/unit/albums-view.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { join } from "node:path";

const projectRoot = process.cwd();

function readProjectFile(path: string): string {
  return readFileSync(join(projectRoot, path), "utf8");
}

describe("albums page source contracts", () => {
  it("creates the albums route with stats and browser data", () => {
    const source = readProjectFile("src/app/dashboard/albums/page.tsx");

    expect(source).toContain("AlbumsBrowser");
    expect(source).toContain("activeShareCount");
    expect(source).toContain("capturedImageCount");
    expect(source).toContain("getOssConfig");
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
```

- [ ] **Step 2: Run the failing albums source tests**

Run: `npm test -- tests/unit/albums-view.test.ts`

Expected: fail because the albums page and components do not exist.

- [ ] **Step 3: Create reusable square thumbnail tile**

Create `src/components/album-photo-tile.tsx`:

```tsx
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
        "group relative aspect-square overflow-hidden rounded-md border border-[color:var(--border)] bg-[color:var(--surface)]",
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
```

- [ ] **Step 4: Create albums browser component**

Create `src/components/albums-browser.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useMemo } from "react";
import { AlbumPhotoTile } from "@/components/album-photo-tile";
import {
  filterAlbumImages,
  groupImagesByTimelineDate,
  type AlbumsViewMode
} from "@/lib/albums/view";

type TagItem = {
  id: string;
  name: string;
  slug: string;
  color?: string | null;
};

type AlbumBrowserImage = {
  id: string;
  objectKey: string;
  filename: string;
  createdAt: string;
  takenAt: string | null;
  tags: TagItem[];
};

type AlbumStats = {
  imageCount: number;
  tagCount: number;
  activeShareCount: number;
  capturedImageCount: number;
};

type AlbumsBrowserProps = {
  images: AlbumBrowserImage[];
  tags: TagItem[];
  stats: AlbumStats;
  view: AlbumsViewMode;
  selectedTagIds: string[];
  fromDate: string;
  toDate: string;
  publicBaseUrl: string;
};

function buildAlbumsHref(params: {
  view: AlbumsViewMode;
  selectedTagIds: string[];
  fromDate: string;
  toDate: string;
}) {
  const searchParams = new URLSearchParams();
  searchParams.set("view", params.view);

  params.selectedTagIds.forEach((tagId) => searchParams.append("tag", tagId));

  if (params.fromDate) {
    searchParams.set("from", params.fromDate);
  }

  if (params.toDate) {
    searchParams.set("to", params.toDate);
  }

  return `/dashboard/albums?${searchParams.toString()}`;
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <article className="rounded-md border border-[color:var(--border)] bg-[color:var(--bg-card)] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[color:var(--text-faint)]">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-[color:var(--text-primary)]">{value}</p>
    </article>
  );
}

export function AlbumsBrowser({
  images,
  tags,
  stats,
  view,
  selectedTagIds,
  fromDate,
  toDate,
  publicBaseUrl
}: AlbumsBrowserProps) {
  const filteredImages = useMemo(
    () =>
      filterAlbumImages(images, {
        selectedTagIds,
        fromDate,
        toDate
      }),
    [fromDate, images, selectedTagIds, toDate]
  );
  const timelineGroups = useMemo(() => groupImagesByTimelineDate(images), [images]);

  return (
    <div className="space-y-5">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="照片总数" value={stats.imageCount} />
        <StatCard label="标签数量" value={stats.tagCount} />
        <StatCard label="活跃分享链接" value={stats.activeShareCount} />
        <StatCard label="有拍摄时间" value={stats.capturedImageCount} />
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-md border border-[color:var(--border)] bg-[color:var(--bg-card)] p-1">
          {(["filter", "timeline"] as const).map((mode) => (
            <Link
              key={mode}
              href={buildAlbumsHref({ view: mode, selectedTagIds, fromDate, toDate })}
              className={[
                "rounded px-3 py-1.5 text-xs font-medium transition",
                view === mode
                  ? "bg-[color:var(--control-active-bg)] text-[color:var(--text-primary)]"
                  : "text-[color:var(--text-muted)] hover:bg-[color:var(--control-hover-bg)]"
              ].join(" ")}
            >
              {mode === "filter" ? "筛选视图" : "时间线视图"}
            </Link>
          ))}
        </div>
      </div>

      {view === "filter" ? (
        <section className="space-y-4">
          <form className="grid gap-3 rounded-md border border-[color:var(--border)] bg-[color:var(--bg-card)] p-4 lg:grid-cols-[minmax(0,1fr)_160px_160px_auto]">
            <input type="hidden" name="view" value="filter" />

            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[color:var(--text-faint)]">
                标签筛选
              </p>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => {
                  const active = selectedTagIds.includes(tag.id);

                  return (
                    <label
                      key={tag.id}
                      className={[
                        "inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition",
                        active
                          ? "border-[color:var(--text-muted)] bg-[color:var(--control-active-bg)] text-[color:var(--text-primary)]"
                          : "border-[color:var(--border)] text-[color:var(--text-muted)] hover:bg-[color:var(--control-hover-bg)]"
                      ].join(" ")}
                    >
                      <input
                        type="checkbox"
                        name="tag"
                        value={tag.id}
                        defaultChecked={active}
                        className="h-3 w-3"
                      />
                      {tag.name}
                    </label>
                  );
                })}
              </div>
            </div>

            <label className="space-y-2">
              <span className="block text-[10px] font-semibold uppercase tracking-[0.22em] text-[color:var(--text-faint)]">
                起始日期
              </span>
              <input
                name="from"
                type="date"
                defaultValue={fromDate}
                className="w-full rounded-md border border-[color:var(--border)] bg-transparent px-3 py-2 text-sm text-[color:var(--text-primary)] outline-none focus:border-[color:var(--text-muted)]"
              />
            </label>

            <label className="space-y-2">
              <span className="block text-[10px] font-semibold uppercase tracking-[0.22em] text-[color:var(--text-faint)]">
                截止日期
              </span>
              <input
                name="to"
                type="date"
                defaultValue={toDate}
                className="w-full rounded-md border border-[color:var(--border)] bg-transparent px-3 py-2 text-sm text-[color:var(--text-primary)] outline-none focus:border-[color:var(--text-muted)]"
              />
            </label>

            <div className="flex items-end gap-2">
              <button
                type="submit"
                className="rounded-md bg-[color:var(--text-primary)] px-4 py-2 text-xs font-semibold text-[color:var(--page-bg)] transition hover:opacity-85"
              >
                应用
              </button>
              <Link
                href="/dashboard/albums?view=filter"
                className="rounded-md px-3 py-2 text-xs text-[color:var(--text-muted)] transition hover:bg-[color:var(--control-hover-bg)]"
              >
                清空
              </Link>
            </div>
          </form>

          {filteredImages.length ? (
            <div className="grid grid-cols-3 gap-1 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-7 2xl:grid-cols-8">
              {filteredImages.map((image) => (
                <AlbumPhotoTile key={image.id} {...image} publicBaseUrl={publicBaseUrl} />
              ))}
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-[color:var(--border)] px-6 py-16 text-center text-sm text-[color:var(--text-muted)]">
              没有符合当前筛选条件的图片。
            </div>
          )}
        </section>
      ) : (
        <section className="space-y-5">
          {timelineGroups.length ? (
            timelineGroups.map((group) => (
              <div key={group.dateKey} className="grid gap-4 md:grid-cols-[150px_minmax(0,1fr)]">
                <div className="relative flex min-h-16 items-start gap-3 border-l border-[color:var(--border)] pl-5">
                  <span className="absolute -left-[5px] top-1 h-2.5 w-2.5 rounded-full bg-[color:var(--text-primary)]" />
                  <span className="text-xs font-medium tabular-nums text-[color:var(--text-muted)]">
                    {group.label}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-7 2xl:grid-cols-8">
                  {group.images.map((image) => (
                    <AlbumPhotoTile key={image.id} {...image} publicBaseUrl={publicBaseUrl} />
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-md border border-dashed border-[color:var(--border)] px-6 py-16 text-center text-sm text-[color:var(--text-muted)]">
              暂无可展示的图片。
            </div>
          )}
        </section>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Create albums route**

Create `src/app/dashboard/albums/page.tsx`:

```tsx
import type { Prisma } from "@prisma/client";
import { AlbumsBrowser } from "@/components/albums-browser";
import { parseAlbumsView } from "@/lib/albums/view";
import { db } from "@/lib/db";
import { getOssConfig } from "@/lib/oss/config";

export const dynamic = "force-dynamic";

type AlbumsPageProps = {
  searchParams?: Promise<{
    view?: string | string[];
    tag?: string | string[];
    from?: string | string[];
    to?: string | string[];
  }>;
};

function asSingleValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function asArray(value: string | string[] | undefined): string[] {
  return Array.isArray(value) ? value.filter(Boolean) : value ? [value] : [];
}

export default async function DashboardAlbumsPage({ searchParams }: AlbumsPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const view = parseAlbumsView(resolvedSearchParams.view);
  const selectedTagIds = Array.from(new Set(asArray(resolvedSearchParams.tag)));
  const fromDate = asSingleValue(resolvedSearchParams.from);
  const toDate = asSingleValue(resolvedSearchParams.to);
  const activeShareWhere: Prisma.ShareWhereInput = {
    revoked: false,
    OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }]
  };

  const [images, tags, imageCount, tagCount, activeShareCount, capturedImageCount] =
    await Promise.all([
      db.image.findMany({
        where: {
          deletedAt: null
        },
        orderBy: {
          createdAt: "desc"
        },
        include: {
          exif: true,
          tags: {
            include: {
              tag: true
            }
          }
        }
      }),
      db.tag.findMany({
        orderBy: {
          name: "asc"
        }
      }),
      db.image.count({
        where: {
          deletedAt: null
        }
      }),
      db.tag.count(),
      db.share.count({
        where: activeShareWhere
      }),
      db.image.count({
        where: {
          deletedAt: null,
          exif: {
            takenAt: {
              not: null
            }
          }
        }
      })
    ]);

  const publicBaseUrl = getOssConfig().publicBaseUrl;

  return (
    <AlbumsBrowser
      view={view}
      selectedTagIds={selectedTagIds}
      fromDate={fromDate}
      toDate={toDate}
      publicBaseUrl={publicBaseUrl}
      stats={{
        imageCount,
        tagCount,
        activeShareCount,
        capturedImageCount
      }}
      tags={tags.map((tag) => ({
        id: tag.id,
        name: tag.name,
        slug: tag.slug,
        color: tag.color
      }))}
      images={images.map((image) => ({
        id: image.id,
        objectKey: image.objectKey,
        filename: image.filename,
        createdAt: image.createdAt.toISOString(),
        takenAt: image.exif?.takenAt?.toISOString() ?? null,
        tags: image.tags.map(({ tag }) => ({
          id: tag.id,
          name: tag.name,
          slug: tag.slug,
          color: tag.color
        }))
      }))}
    />
  );
}
```

- [ ] **Step 6: Run albums tests**

Run: `npm test -- tests/unit/albums-view.test.ts`

Expected: pass.

## Task 4: Map Per-Image Thumbnail Markers

**Files:**
- Modify: `src/components/map-canvas.tsx`
- Modify: `src/components/map-explorer.tsx`
- Modify: `src/app/dashboard/map/page.tsx`
- Modify: `tests/unit/map-explorer-theme.test.ts`

- [ ] **Step 1: Write failing map source tests**

Append to `tests/unit/map-explorer-theme.test.ts`:

```ts
  it("does not render the old tag and date filter controls", () => {
    const content = readProjectFile("src/components/map-explorer.tsx");

    expect(content).not.toContain("标签筛选");
    expect(content).not.toContain("起始日期");
    expect(content).not.toContain("截止日期");
    expect(content).not.toContain("selectedTagId");
    expect(content).not.toContain("fromDate");
    expect(content).not.toContain("toDate");
  });

  it("uses per-image thumbnail markers instead of count-circle markers", () => {
    const canvas = readProjectFile("src/components/map-canvas.tsx");
    const explorer = readProjectFile("src/components/map-explorer.tsx");

    expect(canvas).toContain("thumbnailUrl");
    expect(canvas).toContain("createThumbnailIcon");
    expect(canvas).not.toContain("createMarkerIcon(count");
    expect(explorer).toContain("selectedImage");
    expect(explorer).toContain("image-detail-return-url");
  });
```

- [ ] **Step 2: Run failing map tests**

Run: `npm test -- tests/unit/map-explorer-theme.test.ts`

Expected: fail because old filters and count marker code still exist.

- [ ] **Step 3: Update `MapCanvas` to render thumbnail image markers**

Replace the location types and icon functions in `src/components/map-canvas.tsx` with per-image markers:

```tsx
"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";

export type MapMarkerImage = {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  thumbnailUrl: string;
};

type MapCanvasProps = {
  defaultCenter: [number, number];
  images: MapMarkerImage[];
  onSelectImage: (imageId: string) => void;
};

function createThumbnailIcon(image: MapMarkerImage) {
  const safeUrl = image.thumbnailUrl.replace(/"/g, "%22");

  return L.divIcon({
    className: "",
    html: `<div style="width:28px;height:28px;overflow:hidden;border:2px solid rgba(255,255,255,0.9);background:#0f172a;box-shadow:0 10px 24px rgba(15,23,42,0.35)"><img src="${safeUrl}" alt="" style="width:100%;height:100%;object-fit:cover;display:block" /></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14]
  });
}

function buildPopupContent(image: MapMarkerImage) {
  const wrapper = document.createElement("div");
  wrapper.className = "space-y-1";

  const title = document.createElement("p");
  title.className = "font-semibold";
  title.textContent = image.title;

  wrapper.append(title);
  return wrapper;
}

export function MapCanvas({ defaultCenter, images, onSelectImage }: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerLayerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    const container = containerRef.current;

    if (!container || mapRef.current) {
      return;
    }

    delete (container as HTMLDivElement & { _leaflet_id?: number })._leaflet_id;

    const map = L.map(container, {
      center: defaultCenter,
      zoom: 4,
      zoomControl: true
    });

    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    const markerLayer = L.layerGroup().addTo(map);
    markerLayerRef.current = markerLayer;

    requestAnimationFrame(() => {
      map.invalidateSize();
    });

    return () => {
      markerLayer.clearLayers();
      map.remove();
      markerLayerRef.current = null;
      mapRef.current = null;
      delete (container as HTMLDivElement & { _leaflet_id?: number })._leaflet_id;
    };
  }, [defaultCenter]);

  useEffect(() => {
    const map = mapRef.current;
    const markerLayer = markerLayerRef.current;

    if (!map || !markerLayer) {
      return;
    }

    markerLayer.clearLayers();

    if (!images.length) {
      map.setView(defaultCenter, 4);
      return;
    }

    const bounds = L.latLngBounds([]);

    for (const image of images) {
      const marker = L.marker([image.latitude, image.longitude], {
        icon: createThumbnailIcon(image)
      });

      marker.on("click", () => onSelectImage(image.id));
      marker.bindPopup(buildPopupContent(image));
      marker.addTo(markerLayer);
      bounds.extend([image.latitude, image.longitude]);
    }

    if (images.length === 1) {
      map.setView([images[0].latitude, images[0].longitude], 10);
      return;
    }

    map.fitBounds(bounds.pad(0.2));
  }, [defaultCenter, images, onSelectImage]);

  return <div ref={containerRef} className="h-full w-full bg-surface" />;
}
```

- [ ] **Step 4: Update map explorer for image selection and metadata panel**

Rewrite `src/components/map-explorer.tsx` around a single selected image. It should:

- Remove `availableTags`, `selectedTagId`, `fromDate`, and `toDate`.
- Accept `publicBaseUrl`.
- Build marker DTOs with `thumbnailUrl`.
- Use `selectedImageId` and `selectedImage`.
- Render grid `xl:grid-cols-[minmax(0,1fr)_400px]`.
- Use map height class `h-[calc(100vh-8rem)] min-h-[420px]`.
- Show a large square thumbnail button in the right panel.
- On thumbnail click, store `image-rect-${id}` and `image-detail-return-url` then `router.push("/dashboard/library/" + id)`.

The `MapImage` type should include:

```ts
type MapImage = {
  id: string;
  objectKey: string;
  filename: string;
  createdAt: string;
  takenAt?: string | null;
  effectiveLocation: {
    latitude: number;
    longitude: number;
    label?: string | null;
    source: "manual" | "exif";
  };
  tags: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
};
```

Use this metadata order in the panel: filename, capture time, upload time, tags, coordinate source, latitude, longitude, label.

- [ ] **Step 5: Update map page server data**

In `src/app/dashboard/map/page.tsx`:

- Remove the `db.tag.findMany` query.
- Import `getOssConfig`.
- Pass `publicBaseUrl={getOssConfig().publicBaseUrl}` to `MapExplorer`.
- Remove `availableTags` prop.
- Keep resolving effective locations and filtering images without a location.

- [ ] **Step 6: Run map tests**

Run: `npm test -- tests/unit/map-explorer-theme.test.ts`

Expected: pass.

## Task 5: Integration And E2E Smoke Updates

**Files:**
- Modify: `tests/e2e/gallery.spec.ts`
- Potentially modify: `tests/e2e/image-detail-reopen.spec.ts`

- [ ] **Step 1: Update e2e smoke coverage**

In `tests/e2e/gallery.spec.ts`, after login add:

```ts
  await expect(page).toHaveURL(/\/dashboard\/library$/);
  await expect(page.getByRole("link", { name: "图库" })).toBeVisible();
  await expect(page.getByRole("link", { name: "相册" })).toBeVisible();
  await expect(page.getByRole("link", { name: "首页" })).toHaveCount(0);

  await page.goto(`${baseUrl}/dashboard`);
  await expect(page).toHaveURL(/\/dashboard\/library$/);

  await page.goto(`${baseUrl}/dashboard/albums?view=timeline`);
  await expect(page.getByText("时间线视图")).toBeVisible();
  await expect(page.getByText("照片总数")).toBeVisible();
```

Keep the existing shares and map smoke assertions, but update the map expectation to match the new panel if needed:

```ts
  await page.goto(`${baseUrl}/dashboard/map`);
  await expect(page.getByText("位置面板")).toBeVisible();
```

- [ ] **Step 2: Run focused unit tests**

Run:

```powershell
npm test -- tests/unit/dashboard-navigation.test.ts tests/unit/dashboard-shell-state.test.ts tests/unit/albums-view.test.ts tests/unit/map-explorer-theme.test.ts
```

Expected: pass.

- [ ] **Step 3: Run lint**

Run: `npm run lint`

Expected: pass.

- [ ] **Step 4: Run full unit/integration test suite**

Run: `npm test`

Expected: pass.

- [ ] **Step 5: Start dev server for manual verification**

Run: `npm run dev`

Expected: dev server starts. Visit the reported local URL and verify:

- `/dashboard` redirects to `/dashboard/library`.
- `/dashboard/albums` shows stats, filter view, and timeline view.
- `/dashboard/map` shows a map with thumbnail markers and the right panel.

If an existing server is already running, use the existing URL from the logs instead of starting another long-lived process.

## Self-Review Checklist

- Spec coverage: navigation, dashboard redirect, albums stats, albums filter, albums timeline fallback rule, map filter removal, thumbnail markers, right panel detail navigation, and verification are all covered by tasks.
- Placeholder scan: no task contains "TBD", "TODO", or unspecified code-change steps.
- Type consistency: `AlbumBrowserImage` matches `AlbumImageLike`; map page `MapImage` matches `MapExplorer`; `MapCanvas` uses `images` and `onSelectImage`.

"use client";

import Link from "next/link";
import { useMemo } from "react";
import { AlbumPhotoTile } from "@/components/album-photo-tile";
import {
  buildMemoryHighlights,
  filterAlbumImages,
  groupImagesByTimelineDate,
  type AlbumsViewMode,
  type MemoryHighlight
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
  favoriteImages: AlbumBrowserImage[];
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
    <article className="rounded-md border border-border bg-card p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[color:var(--text-faint)]">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-[color:var(--text-primary)]">{value}</p>
    </article>
  );
}

function getMemoryHighlightAccent(kind: MemoryHighlight<AlbumBrowserImage>["kind"]): string {
  if (kind === "anniversary") {
    return "from-rose-400/20 via-amber-300/10 to-transparent";
  }

  if (kind === "month") {
    return "from-sky-400/20 via-emerald-300/10 to-transparent";
  }

  return "from-violet-400/20 via-fuchsia-300/10 to-transparent";
}

function MemoryPhotoPreview({
  images,
  publicBaseUrl
}: {
  images: AlbumBrowserImage[];
  publicBaseUrl: string;
}) {
  const previewImages = images.slice(0, 10);
  const heroImage = previewImages[0];
  const supportingImages = previewImages.slice(1, 10);

  return (
    <div className="grid min-h-48 grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] gap-1 p-1">
      {heroImage ? (
        <AlbumPhotoTile
          {...heroImage}
          publicBaseUrl={publicBaseUrl}
          entryIndex={0}
          className="h-full min-h-0"
        />
      ) : (
        <div className="flex min-h-40 items-center justify-center rounded-md border border-dashed border-border bg-surface text-xs text-[color:var(--text-faint)]">
          暂无照片
        </div>
      )}
      <div className="grid grid-cols-3 gap-1">
        {supportingImages.map((image, index) => (
          <AlbumPhotoTile
            key={image.id}
            {...image}
            publicBaseUrl={publicBaseUrl}
            entryIndex={index + 1}
          />
        ))}
        {Array.from({ length: Math.max(0, 9 - supportingImages.length) }, (_, index) => (
          <div
            key={`empty-${index}`}
            className="aspect-square rounded-md border border-dashed border-border bg-surface/50"
          />
        ))}
      </div>
    </div>
  );
}

function MemoryHighlightCard({
  highlight,
  publicBaseUrl
}: {
  highlight: MemoryHighlight<AlbumBrowserImage>;
  publicBaseUrl: string;
}) {
  return (
    <article className="flex min-h-96 flex-col overflow-hidden rounded-md border border-border bg-card transition hover:border-[color:var(--text-faint)]">
      <div className={["bg-gradient-to-br p-4", getMemoryHighlightAccent(highlight.kind)].join(" ")}>
        <div className="flex min-h-28 flex-col justify-between gap-4">
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[color:var(--text-faint)]">
              {highlight.kind === "anniversary" ? "今日回望" : highlight.kind === "month" ? "月度片段" : "心情标签"}
            </p>
            <Link
              href={`/dashboard/albums/memories/${highlight.id}`}
              className="block space-y-1 rounded-sm outline-none transition hover:opacity-80 focus-visible:ring-2 focus-visible:ring-[color:var(--text-muted)]"
            >
              <h3 className="text-lg font-semibold leading-6 text-[color:var(--text-primary)]">
                {highlight.title}
              </h3>
              <p className="text-xs leading-5 text-[color:var(--text-muted)]">
                {highlight.description}
              </p>
            </Link>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={`/dashboard/albums/memories/${highlight.id}`}
              className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-[color:var(--text-secondary)] transition hover:bg-[color:var(--control-hover-bg)] hover:text-[color:var(--text-primary)]"
            >
              打开回忆
            </Link>
          </div>
        </div>
      </div>

      <MemoryPhotoPreview images={highlight.previewImages} publicBaseUrl={publicBaseUrl} />
    </article>
  );
}

function FavoriteAlbumCard({
  favoriteImages,
  publicBaseUrl
}: {
  favoriteImages: AlbumBrowserImage[];
  publicBaseUrl: string;
}) {
  const favoritePreviewImages = favoriteImages.slice(0, 10);

  return (
    <article className="flex min-h-96 flex-col overflow-hidden rounded-md border border-border bg-card transition hover:border-[color:var(--text-faint)]">
      <Link
        href="/dashboard/albums/favorites"
        className="block bg-gradient-to-br from-red-400/20 via-pink-300/10 to-transparent p-4 transition hover:bg-[color:var(--control-hover-bg)]"
      >
        <div className="flex min-h-28 flex-col justify-between gap-4">
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[color:var(--text-faint)]">
              收藏相册
            </p>
            <div className="space-y-1">
              <h3 className="text-lg font-semibold leading-6 text-[color:var(--text-primary)]">
                被红心留下的照片
              </h3>
              <p className="text-xs leading-5 text-[color:var(--text-muted)]">
                最近收藏的 {favoriteImages.length} 张照片，会优先把新点亮的瞬间放在这里。
              </p>
            </div>
          </div>

          <span className="w-fit rounded-md border border-border px-3 py-1.5 text-xs font-medium text-[color:var(--text-secondary)]">
            打开收藏
          </span>
        </div>
      </Link>

      <MemoryPhotoPreview images={favoritePreviewImages} publicBaseUrl={publicBaseUrl} />
    </article>
  );
}

export function AlbumsBrowser({
  favoriteImages,
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
  const memoryHighlights = useMemo(() => buildMemoryHighlights(images), [images]);

  return (
    <div className="space-y-5">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="照片总数" value={stats.imageCount} />
        <StatCard label="标签数量" value={stats.tagCount} />
        <StatCard label="活跃分享链接" value={stats.activeShareCount} />
        <StatCard label="有拍摄时间" value={stats.capturedImageCount} />
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[color:var(--text-faint)]">
              回忆精选
            </p>
            <h2 className="mt-1 text-base font-semibold text-[color:var(--text-primary)]">
              今天适合重新打开的几段照片
            </h2>
          </div>
          <p className="max-w-md text-xs leading-5 text-[color:var(--text-muted)]">
            根据拍摄日期、月份密度和标签自动整理，适合回看，也适合直接分享给在场的人。
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {memoryHighlights.map((highlight) => (
            <MemoryHighlightCard
              key={highlight.id}
              highlight={highlight}
              publicBaseUrl={publicBaseUrl}
            />
          ))}
          <FavoriteAlbumCard favoriteImages={favoriteImages} publicBaseUrl={publicBaseUrl} />
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-md border border-border bg-card p-1">
          {(["filter", "timeline"] as const).map((mode) => (
            <Link
              key={mode}
              href={buildAlbumsHref({ view: mode, selectedTagIds, fromDate, toDate })}
              className={[
                "rounded px-3 py-1.5 text-xs font-medium transition",
                view === mode
                  ? "bg-[color:var(--control-hover-bg)] text-[color:var(--text-primary)]"
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
          <form className="grid gap-3 rounded-md border border-border bg-card p-4 lg:grid-cols-[minmax(0,1fr)_160px_160px_auto]">
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
                          ? "border-[color:var(--text-muted)] bg-[color:var(--control-hover-bg)] text-[color:var(--text-primary)]"
                          : "border-border text-[color:var(--text-muted)] hover:bg-[color:var(--control-hover-bg)]"
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
                className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm text-[color:var(--text-primary)] outline-none focus:border-[color:var(--text-muted)]"
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
                className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm text-[color:var(--text-primary)] outline-none focus:border-[color:var(--text-muted)]"
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
              {filteredImages.map((image, index) => (
                <AlbumPhotoTile
                  key={image.id}
                  {...image}
                  publicBaseUrl={publicBaseUrl}
                  entryIndex={index}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-border px-6 py-16 text-center text-sm text-[color:var(--text-muted)]">
              没有符合当前筛选条件的图片。
            </div>
          )}
        </section>
      ) : (
        <section className="space-y-5">
          {timelineGroups.length ? (
            timelineGroups.map((group) => (
              <div key={group.dateKey} className="grid gap-4 md:grid-cols-[150px_minmax(0,1fr)]">
                <div className="relative flex min-h-16 items-start gap-3 border-l border-border pl-5">
                  <span className="absolute -left-[5px] top-1 h-2.5 w-2.5 rounded-full bg-[color:var(--text-primary)]" />
                  <span className="text-xs font-medium tabular-nums text-[color:var(--text-muted)]">
                    {group.label}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-7 2xl:grid-cols-8">
                  {group.images.map((image, index) => (
                    <AlbumPhotoTile
                      key={image.id}
                      {...image}
                      publicBaseUrl={publicBaseUrl}
                      entryIndex={index}
                    />
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-md border border-dashed border-border px-6 py-16 text-center text-sm text-[color:var(--text-muted)]">
              暂无可展示的图片。
            </div>
          )}
        </section>
      )}
    </div>
  );
}

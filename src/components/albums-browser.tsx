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
    <article className="rounded-md border border-border bg-card p-4">
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
              {filteredImages.map((image) => (
                <AlbumPhotoTile key={image.id} {...image} publicBaseUrl={publicBaseUrl} />
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
                  {group.images.map((image) => (
                    <AlbumPhotoTile key={image.id} {...image} publicBaseUrl={publicBaseUrl} />
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

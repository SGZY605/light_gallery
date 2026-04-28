"use client";

import { useMemo, useState } from "react";
import { ExifSummary } from "@/components/exif-summary";
import { buildOssImageUrl } from "@/lib/oss/urls";

type ImageGridImage = {
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
  images: ImageGridImage[];
  emptyMessage?: string;
  publicBaseUrl: string;
};

function formatCreatedAt(value: Date | string | undefined): string | null {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function formatDimensions(width?: number | null, height?: number | null): string | null {
  return typeof width === "number" && typeof height === "number" ? `${width} x ${height}` : null;
}

export function ImageGrid({
  images,
  emptyMessage = "当前筛选条件下没有匹配的图片。",
  publicBaseUrl
}: ImageGridProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeImageId, setActiveImageId] = useState<string | null>(null);
  const selectedCount = selectedIds.length;
  const allSelected = images.length > 0 && selectedCount === images.length;
  const activeImage = useMemo(
    () => images.find((image) => image.id === activeImageId) ?? null,
    [activeImageId, images]
  );

  function toggleSelected(imageId: string) {
    setSelectedIds((currentIds) =>
      currentIds.includes(imageId)
        ? currentIds.filter((currentId) => currentId !== imageId)
        : [...currentIds, imageId]
    );
  }

  if (!images.length) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 px-6 py-16 text-center text-sm text-slate-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[28px] border border-slate-200 bg-slate-50 px-5 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-400">批量工具栏</p>
          <p className="mt-2 text-sm text-slate-600">
            已选择 {selectedCount} 张。批量标签操作暂未开放，但选择状态已经可用。
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSelectedIds(allSelected ? [] : images.map((image) => image.id))}
            className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-950 hover:text-slate-950"
          >
            {allSelected ? "清空选择" : "全选"}
          </button>
          <button
            type="button"
            disabled={!selectedCount}
            className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-400 disabled:cursor-not-allowed"
          >
            添加标签
          </button>
          <button
            type="button"
            disabled={!selectedCount}
            className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-400 disabled:cursor-not-allowed"
          >
            移除标签
          </button>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {images.map((image) => {
          const thumbUrl = buildOssImageUrl(image.objectKey, "thumb", { publicBaseUrl });
          const createdAt = formatCreatedAt(image.createdAt);
          const dimensions = formatDimensions(image.width, image.height);
          const isSelected = selectedIds.includes(image.id);

          return (
            <article
              key={image.id}
              className={[
                "overflow-hidden rounded-[28px] border bg-white shadow-[0_18px_60px_rgba(15,23,42,0.08)] transition",
                isSelected ? "border-slate-950 ring-2 ring-slate-950/10" : "border-slate-200"
              ].join(" ")}
            >
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setActiveImageId(image.id)}
                  className="block aspect-[4/3] w-full bg-slate-200 bg-cover bg-center"
                  style={{ backgroundImage: `url("${thumbUrl}")` }}
                  aria-label={`打开 ${image.filename} 的详情`}
                />

                <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3">
                  <button
                    type="button"
                    onClick={() => toggleSelected(image.id)}
                    className={[
                      "rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] backdrop-blur transition",
                      isSelected
                        ? "bg-slate-950 text-white"
                        : "bg-white/90 text-slate-800 hover:bg-white"
                    ].join(" ")}
                  >
                    {isSelected ? "已选择" : "选择"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveImageId(image.id)}
                    className="rounded-full bg-white/90 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-800 backdrop-blur transition hover:bg-white"
                  >
                    详情
                  </button>
                </div>
              </div>

              <div className="space-y-4 p-5">
                <div className="space-y-1">
                  <h2 className="truncate text-base font-semibold text-slate-950">{image.filename}</h2>
                  {image.description ? (
                    <p className="line-clamp-2 text-sm text-slate-600">{image.description}</p>
                  ) : null}
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs uppercase tracking-[0.2em] text-slate-400">
                    {createdAt ? <span>{createdAt}</span> : null}
                    {dimensions ? <span>{dimensions}</span> : null}
                  </div>
                </div>

                {image.tags.length ? (
                  <div className="flex flex-wrap gap-2">
                    {image.tags.map((tag) => (
                      <span
                        key={tag.id}
                        className="rounded-full border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600"
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                ) : null}

                <ExifSummary exif={image.exif} className="space-y-1 text-xs text-slate-500" />
              </div>
            </article>
          );
        })}
      </div>

      {activeImage ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 py-8">
          <div className="relative grid max-h-full w-full max-w-6xl gap-6 overflow-auto rounded-[36px] border border-white/10 bg-white p-6 shadow-[0_30px_110px_rgba(15,23,42,0.35)] lg:grid-cols-[minmax(0,1.3fr)_360px]">
            <button
              type="button"
              onClick={() => setActiveImageId(null)}
              className="absolute right-5 top-5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-950 hover:text-slate-950"
            >
              关闭
            </button>

            <div
              className="min-h-[360px] rounded-[28px] bg-slate-100 bg-contain bg-center bg-no-repeat"
              style={{ backgroundImage: `url("${buildOssImageUrl(activeImage.objectKey, "preview", { publicBaseUrl })}")` }}
            />

            <aside className="space-y-5 rounded-[28px] border border-slate-200 bg-slate-50 p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-400">图片详情</p>
                <h3 className="mt-3 text-2xl font-semibold text-slate-950">{activeImage.filename}</h3>
                {activeImage.description ? (
                  <p className="mt-3 text-sm leading-6 text-slate-600">{activeImage.description}</p>
                ) : null}
              </div>

              <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
                {formatCreatedAt(activeImage.createdAt) ? (
                  <p>
                    <span className="font-semibold text-slate-900">添加时间：</span>
                    {formatCreatedAt(activeImage.createdAt)}
                  </p>
                ) : null}
                {formatDimensions(activeImage.width, activeImage.height) ? (
                  <p>
                    <span className="font-semibold text-slate-900">尺寸：</span>
                    {formatDimensions(activeImage.width, activeImage.height)}
                  </p>
                ) : null}
              </div>

              {activeImage.tags.length ? (
                <div className="flex flex-wrap gap-2">
                  {activeImage.tags.map((tag) => (
                    <span
                      key={tag.id}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600"
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              ) : null}

              <ExifSummary exif={activeImage.exif} className="space-y-2 text-sm text-slate-600" />

              <a
                href={buildOssImageUrl(activeImage.objectKey, "original", { publicBaseUrl })}
                target="_blank"
                rel="noreferrer"
                className="inline-flex rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                查看原图
              </a>
            </aside>
          </div>
        </div>
      ) : null}
    </div>
  );
}

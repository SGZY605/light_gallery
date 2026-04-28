"use client";

import { useState } from "react";
import { ExifSummary } from "@/components/exif-summary";
import { buildOssImageUrl } from "@/lib/oss/urls";

type ShareGalleryImage = {
  id: string;
  objectKey: string;
  filename: string;
  description?: string | null;
  tags: Array<{ id: string; name: string; slug: string }>;
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

type ShareGalleryProps = {
  allowDownload: boolean;
  images: ShareGalleryImage[];
  publicBaseUrl: string;
  title: string;
};

export function ShareGallery({ allowDownload, images, publicBaseUrl, title }: ShareGalleryProps) {
  const [activeImageId, setActiveImageId] = useState<string | null>(null);
  const activeImage = images.find((image) => image.id === activeImageId) ?? null;

  if (!images.length) {
    return (
      <div className="rounded-[32px] border border-white/20 bg-white/10 px-6 py-16 text-center text-sm text-white/70">
        当前没有图片符合此分享条件。
      </div>
    );
  }

  return (
    <>
      <div className="columns-1 gap-5 sm:columns-2 xl:columns-3">
        {images.map((image) => (
          <button
            key={image.id}
            type="button"
            onClick={() => setActiveImageId(image.id)}
            className="mb-5 block w-full break-inside-avoid overflow-hidden rounded-[28px] border border-white/15 bg-white/10 text-left shadow-[0_28px_90px_rgba(15,23,42,0.28)] transition hover:-translate-y-1 hover:border-white/30"
          >
            <div
              className="aspect-[4/3] bg-slate-700 bg-cover bg-center"
              style={{ backgroundImage: `url("${buildOssImageUrl(image.objectKey, "thumb", { publicBaseUrl })}")` }}
            />
            <div className="space-y-3 p-4">
              <div>
                <p className="text-sm font-medium text-white">{image.filename}</p>
                {image.description ? <p className="mt-1 text-sm text-white/70">{image.description}</p> : null}
              </div>

              {image.tags.length ? (
                <div className="flex flex-wrap gap-2">
                  {image.tags.map((tag) => (
                    <span
                      key={tag.id}
                      className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white/70"
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </button>
        ))}
      </div>

      {activeImage ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/88 px-4 py-8">
          <div className="relative grid max-h-full w-full max-w-6xl gap-6 overflow-auto rounded-[36px] border border-white/10 bg-slate-950 p-6 text-white lg:grid-cols-[minmax(0,1.3fr)_360px]">
            <button
              type="button"
              onClick={() => setActiveImageId(null)}
              className="absolute right-5 top-5 rounded-full border border-white/15 px-3 py-1 text-xs font-semibold text-white/70 transition hover:border-white/35 hover:text-white"
            >
              关闭
            </button>

            <div
              className="min-h-[360px] rounded-[28px] bg-slate-900 bg-contain bg-center bg-no-repeat"
              style={{ backgroundImage: `url("${buildOssImageUrl(activeImage.objectKey, "preview", { publicBaseUrl })}")` }}
              aria-label={activeImage.filename}
            />

            <aside className="space-y-5 rounded-[28px] border border-white/10 bg-white/5 p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.32em] text-amber-300">{title}</p>
                <h3 className="mt-3 text-2xl font-semibold text-white">{activeImage.filename}</h3>
                {activeImage.description ? <p className="mt-3 text-sm leading-6 text-white/70">{activeImage.description}</p> : null}
              </div>

              <ExifSummary exif={activeImage.exif} className="space-y-2 text-sm text-white/70" />

              {activeImage.tags.length ? (
                <div className="flex flex-wrap gap-2">
                  {activeImage.tags.map((tag) => (
                    <span
                      key={tag.id}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/70"
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              ) : null}

              {allowDownload ? (
                <a
                  href={buildOssImageUrl(activeImage.objectKey, "original", { publicBaseUrl })}
                  className="inline-flex rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-200"
                >
                  下载原图
                </a>
              ) : null}
            </aside>
          </div>
        </div>
      ) : null}
    </>
  );
}

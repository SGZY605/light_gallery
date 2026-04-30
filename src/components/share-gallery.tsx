"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { buildOssImageUrl } from "@/lib/oss/urls";
import { ExifSummary } from "@/components/exif-summary";

type ShareGalleryImage = {
  id: string;
  objectKey: string;
  filename: string;
  description?: string | null;
  width?: number | null;
  height?: number | null;
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
};

export function ShareGallery({
  allowDownload,
  images,
  publicBaseUrl,
}: ShareGalleryProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const activeImage =
    activeIndex !== null && activeIndex >= 0 && activeIndex < images.length
      ? images[activeIndex]
      : null;

  const openLightbox = useCallback((index: number) => {
    setActiveIndex(index);
  }, []);

  const closeLightbox = useCallback(() => {
    setActiveIndex(null);
  }, []);

  const goToPrev = useCallback(() => {
    setActiveIndex((prev) => {
      if (prev === null) return null;
      return prev > 0 ? prev - 1 : images.length - 1;
    });
  }, [images.length]);

  const goToNext = useCallback(() => {
    setActiveIndex((prev) => {
      if (prev === null) return null;
      return prev < images.length - 1 ? prev + 1 : 0;
    });
  }, [images.length]);

  useEffect(() => {
    if (activeIndex === null) return;

    function handleKeyDown(e: KeyboardEvent) {
      switch (e.key) {
        case "Escape":
          closeLightbox();
          break;
        case "ArrowLeft":
          goToPrev();
          break;
        case "ArrowRight":
          goToNext();
          break;
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [activeIndex, closeLightbox, goToPrev, goToNext]);

  if (!images.length) {
    return (
      <div className="px-6 py-16 text-center text-sm text-white/40">
        没有匹配此分享的图片。
      </div>
    );
  }

  return (
    <>
      {/* Masonry grid */}
      <div className="columns-2 md:columns-3 xl:columns-4 gap-0.5">
        {images.map((image, index) => (
          <Image
            key={image.id}
            src={buildOssImageUrl(image.objectKey, "thumb", { publicBaseUrl })}
            alt={image.filename}
            width={image.width ?? 480}
            height={image.height ?? 480}
            sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw"
            unoptimized
            loading="lazy"
            onClick={() => openLightbox(index)}
            className="w-full h-auto break-inside-avoid mb-0.5 cursor-pointer hover:opacity-80 transition-opacity block"
          />
        ))}
      </div>

      {/* Immersive lightbox */}
      <AnimatePresence>
        {activeImage !== null && activeIndex !== null ? (
          <motion.div
            key="lightbox"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex flex-col bg-black"
          >
            {/* Top bar: counter + close */}
            <div className="flex items-center justify-between px-3 py-2 text-white/40 text-xs">
              <span className="tabular-nums">
                {activeIndex + 1} / {images.length}
              </span>
              <div className="flex items-center gap-2">
                {allowDownload ? (
                  <a
                    href={buildOssImageUrl(activeImage.objectKey, "original", {
                      publicBaseUrl
                    })}
                    download={activeImage.filename}
                    className="inline-flex items-center gap-1 rounded-full bg-white/[0.06] px-2.5 py-1 text-[10px] font-medium text-white/40 transition hover:bg-white/15 hover:text-white/70"
                  >
                    <Download className="size-3" />
                    下载
                  </a>
                ) : null}
                <button
                  type="button"
                  onClick={closeLightbox}
                  className="rounded-full p-1 text-white/30 transition hover:text-white hover:bg-white/10"
                  aria-label="关闭"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            </div>

            {/* Main image area */}
            <div className="relative flex-1 flex items-center justify-center min-h-0 px-4">
              {/* Prev button */}
              <button
                type="button"
                onClick={goToPrev}
                className="absolute left-3 z-10 rounded-full p-1.5 text-white/20 transition hover:text-white hover:bg-white/10"
                aria-label="上一张"
              >
                <ChevronLeft className="size-3.5" />
              </button>

              <motion.div
                key={activeImage.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.15 }}
                className="relative h-full w-full"
              >
                <Image
                  src={buildOssImageUrl(activeImage.objectKey, "preview", {
                    publicBaseUrl
                  })}
                  alt={activeImage.filename}
                  fill
                  sizes="100vw"
                  unoptimized
                  className="object-contain"
                />
              </motion.div>

              {/* Next button */}
              <button
                type="button"
                onClick={goToNext}
                className="absolute right-3 z-10 rounded-full p-1.5 text-white/20 transition hover:text-white hover:bg-white/10"
                aria-label="下一张"
              >
                <ChevronRight className="size-3.5" />
              </button>
            </div>

            {/* Bottom bar: EXIF info + filename */}
            <div className="px-4 py-2">
              <p className="text-xs font-medium text-white/50 truncate">
                {activeImage.filename}
              </p>
              {activeImage.description ? (
                <p className="mt-0.5 text-[10px] text-white/30 truncate">
                  {activeImage.description}
                </p>
              ) : null}
              <ExifSummary
                exif={activeImage.exif}
                className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-white/25"
              />
            </div>

            {/* Thumbnail strip */}
            <div className="flex gap-1 overflow-x-auto px-3 pb-3 pt-1">
              {images.map((image, index) => (
                <button
                  key={image.id}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  className={`relative shrink-0 h-10 w-16 overflow-hidden rounded transition ${
                    index === activeIndex
                      ? "ring-1 ring-white/40 opacity-100"
                      : "opacity-40 hover:opacity-70"
                  }`}
                >
                  <Image
                    src={buildOssImageUrl(image.objectKey, "thumb", {
                      publicBaseUrl
                    })}
                    alt={image.filename}
                    fill
                    sizes="64px"
                    unoptimized
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

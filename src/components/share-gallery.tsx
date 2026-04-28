"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { buildOssImageUrl } from "@/lib/oss/urls";
import { ExifSummary } from "@/components/exif-summary";

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

export function ShareGallery({
  allowDownload,
  images,
  publicBaseUrl,
  title
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
        No images currently match this share.
      </div>
    );
  }

  return (
    <>
      {/* Masonry grid */}
      <div className="columns-2 md:columns-3 xl:columns-4 gap-1">
        {images.map((image, index) => (
          <img
            key={image.id}
            src={buildOssImageUrl(image.objectKey, "thumb", { publicBaseUrl })}
            alt={image.filename}
            loading="lazy"
            onClick={() => openLightbox(index)}
            className="w-full h-auto break-inside-avoid mb-1 cursor-pointer hover:opacity-80 transition-opacity block"
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
            <div className="flex items-center justify-between px-4 py-3 text-white/80 text-sm">
              <span className="tabular-nums">
                {activeIndex + 1} / {images.length}
              </span>
              <div className="flex items-center gap-3">
                {allowDownload ? (
                  <a
                    href={buildOssImageUrl(activeImage.objectKey, "original", {
                      publicBaseUrl
                    })}
                    download={activeImage.filename}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white/80 transition hover:bg-white/20 hover:text-white"
                  >
                    <Download className="size-3.5" />
                    Download
                  </a>
                ) : null}
                <button
                  type="button"
                  onClick={closeLightbox}
                  className="rounded-full p-1.5 transition hover:bg-white/10"
                  aria-label="Close"
                >
                  <X className="size-5" />
                </button>
              </div>
            </div>

            {/* Main image area */}
            <div className="relative flex-1 flex items-center justify-center min-h-0 px-4">
              {/* Prev button */}
              <button
                type="button"
                onClick={goToPrev}
                className="absolute left-3 z-10 rounded-full bg-white/10 p-2 text-white/70 transition hover:bg-white/20 hover:text-white"
                aria-label="Previous image"
              >
                <ChevronLeft className="size-6" />
              </button>

              <motion.img
                key={activeImage.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.15 }}
                src={buildOssImageUrl(activeImage.objectKey, "preview", {
                  publicBaseUrl
                })}
                alt={activeImage.filename}
                className="max-h-full max-w-full object-contain"
              />

              {/* Next button */}
              <button
                type="button"
                onClick={goToNext}
                className="absolute right-3 z-10 rounded-full bg-white/10 p-2 text-white/70 transition hover:bg-white/20 hover:text-white"
                aria-label="Next image"
              >
                <ChevronRight className="size-6" />
              </button>
            </div>

            {/* Bottom bar: EXIF info + filename */}
            <div className="px-4 py-3">
              <p className="text-sm font-medium text-white/90 truncate">
                {activeImage.filename}
              </p>
              {activeImage.description ? (
                <p className="mt-0.5 text-xs text-white/50 truncate">
                  {activeImage.description}
                </p>
              ) : null}
              <ExifSummary
                exif={activeImage.exif}
                className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/40"
              />
            </div>

            {/* Thumbnail strip */}
            <div className="flex gap-1 overflow-x-auto px-4 pb-4 pt-1">
              {images.map((image, index) => (
                <button
                  key={image.id}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  className={`shrink-0 h-14 w-20 overflow-hidden rounded transition ${
                    index === activeIndex
                      ? "ring-1 ring-white/60 opacity-100"
                      : "opacity-50 hover:opacity-80"
                  }`}
                >
                  <img
                    src={buildOssImageUrl(image.objectKey, "thumb", {
                      publicBaseUrl
                    })}
                    alt={image.filename}
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

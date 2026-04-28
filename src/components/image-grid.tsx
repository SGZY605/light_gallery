"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { buildOssImageUrl } from "@/lib/oss/urls";
import { ExifSummary } from "@/components/exif-summary";

type ImageItem = {
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
  images: ImageItem[];
  emptyMessage?: string;
  publicBaseUrl: string;
};

export function ImageGrid({
  images,
  emptyMessage = "No images match the current filters.",
  publicBaseUrl,
}: ImageGridProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const goTo = useCallback(
    (index: number) => {
      setLightboxIndex(((index % images.length) + images.length) % images.length);
    },
    [images.length],
  );

  const goPrev = useCallback(() => {
    setLightboxIndex((prev) => {
      if (prev === null) return null;
      return ((prev - 1 + images.length) % images.length);
    });
  }, [images.length]);

  const goNext = useCallback(() => {
    setLightboxIndex((prev) => {
      if (prev === null) return null;
      return ((prev + 1) % images.length);
    });
  }, [images.length]);

  const closeLightbox = useCallback(() => {
    setLightboxIndex(null);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    if (lightboxIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          goPrev();
          break;
        case "ArrowRight":
          e.preventDefault();
          goNext();
          break;
        case "Escape":
          e.preventDefault();
          closeLightbox();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxIndex, goPrev, goNext, closeLightbox]);

  // Empty state
  if (!images.length) {
    return (
      <div className="flex items-center justify-center px-6 py-24 text-sm text-white/40">
        {emptyMessage}
      </div>
    );
  }

  const currentImage = lightboxIndex !== null ? images[lightboxIndex] : null;
  const hasMultiple = images.length > 1;

  return (
    <>
      {/* --------------- Masonry grid --------------- */}
      <div className="columns-2 md:columns-3 xl:columns-4 gap-1">
        {images.map((image, index) => (
          <div key={image.id} className="break-inside-avoid mb-1">
            <img
              src={buildOssImageUrl(image.objectKey, "thumb", { publicBaseUrl })}
              alt={image.filename}
              className="w-full h-auto cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => setLightboxIndex(index)}
            />
          </div>
        ))}
      </div>

      {/* --------------- Lightbox --------------- */}
      <AnimatePresence>
        {lightboxIndex !== null && currentImage && (
          <motion.div
            key="lightbox"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex flex-col items-center justify-center"
            onClick={closeLightbox}
          >
            {/* Close button */}
            <button
              onClick={closeLightbox}
              className="absolute top-4 right-4 z-10 rounded-full p-2 text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Close lightbox"
            >
              <X className="h-6 w-6" />
            </button>

            {/* Counter */}
            <div className="absolute top-4 left-4 z-10 text-sm text-white/60 tabular-nums">
              {lightboxIndex + 1} / {images.length}
            </div>

            {/* Previous arrow */}
            {hasMultiple && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  goPrev();
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-10 rounded-full p-3 text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Previous image"
              >
                <ChevronLeft className="h-8 w-8" />
              </button>
            )}

            {/* Next arrow */}
            {hasMultiple && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  goNext();
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-10 rounded-full p-3 text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Next image"
              >
                <ChevronRight className="h-8 w-8" />
              </button>
            )}

            {/* Main image */}
            <div
              className="flex-1 flex items-center justify-center p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={buildOssImageUrl(currentImage.objectKey, "preview", { publicBaseUrl })}
                alt={currentImage.filename}
                className="max-w-[90vw] max-h-[80vh] object-contain select-none"
                draggable={false}
              />
            </div>

            {/* Bottom info bar */}
            <div
              className="w-full bg-black/60 px-4 py-3 flex items-center gap-6 text-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="text-white/90 font-medium truncate">
                {currentImage.filename}
              </span>
              {currentImage.exif && (
                <ExifSummary
                  exif={currentImage.exif}
                  className="hidden sm:flex items-center gap-4 text-xs text-white/50"
                />
              )}
            </div>

            {/* Thumbnail strip */}
            {hasMultiple && (
              <div
                className="w-full bg-black/80 border-t border-white/[0.06] px-2 py-2"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex gap-1 overflow-x-auto">
                  {images.map((image, idx) => (
                    <button
                      key={image.id}
                      onClick={() => goTo(idx)}
                      className={`flex-shrink-0 h-12 w-12 overflow-hidden transition-colors ${
                        idx === lightboxIndex
                          ? "ring-2 ring-white"
                          : "ring-1 ring-white/10 hover:ring-white/40"
                      }`}
                    >
                      <img
                        src={buildOssImageUrl(image.objectKey, "thumb", { publicBaseUrl })}
                        alt={image.filename}
                        className="h-full w-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

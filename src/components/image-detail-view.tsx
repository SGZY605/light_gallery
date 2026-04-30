"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Minus, Plus, RefreshCw, X, ZoomIn } from "lucide-react";
import { ImageDetailSidebar } from "@/components/image-detail-sidebar";
import {
  clampViewerOffset,
  createWheelZoomTransform,
  getViewerCursorState,
  type ViewerTransform
} from "@/lib/images/viewer-transform";
import { buildOssImageUrl } from "@/lib/oss/urls";

type TagItem = {
  id: string;
  name: string;
  slug: string;
  color?: string | null;
};

type ExifData = {
  cameraMake?: string | null;
  cameraModel?: string | null;
  lensModel?: string | null;
  focalLength?: number | null;
  fNumber?: number | null;
  exposureTime?: string | null;
  iso?: number | null;
  takenAt?: string | null;
  width?: number | null;
  height?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  raw?: unknown;
};

type LocationData = {
  latitude: number;
  longitude: number;
  label?: string | null;
};

type ImageData = {
  id: string;
  objectKey: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  width?: number | null;
  height?: number | null;
  description?: string | null;
  createdAt: string;
  exif?: ExifData | null;
  location?: LocationData | null;
  tags: TagItem[];
};

type ImageDetailViewProps = {
  image: ImageData;
  allTags: TagItem[];
  publicBaseUrl: string;
};

type AnimRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type ViewportSize = {
  width: number;
  height: number;
};

type DragState = {
  isDragging: boolean;
  startX: number;
  startY: number;
  startTransX: number;
  startTransY: number;
};

const MIN_SCALE = 0.25;
const MAX_SCALE = 6;
const DEFAULT_RETURN_URL = "/dashboard/library";
const HISTORY_GUARD_KEY = "image-detail-guard";
const RETURN_URL_KEY = "image-detail-return-url";

function getDefaultDragState(): DragState {
  return {
    isDragging: false,
    startX: 0,
    startY: 0,
    startTransX: 0,
    startTransY: 0
  };
}

export function ImageDetailView({ image, allTags, publicBaseUrl }: ImageDetailViewProps) {
  const router = useRouter();
  const previewUrl = buildOssImageUrl(image.objectKey, "preview", { publicBaseUrl });
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imageBoundsRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState>(getDefaultDragState());
  const returnUrlRef = useRef(DEFAULT_RETURN_URL);
  const hasUnsavedChangesRef = useRef(false);

  const [animRect, setAnimRect] = useState<AnimRect | null>(null);
  const [viewport, setViewport] = useState<ViewportSize | null>(null);
  const [showContent, setShowContent] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [baseImageSize, setBaseImageSize] = useState<ViewportSize>({ width: 0, height: 0 });
  const [transform, setTransform] = useState<ViewerTransform>({ x: 0, y: 0, scale: 1 });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);

  const updateBaseImageSize = useCallback(() => {
    if (!imageBoundsRef.current) {
      return;
    }

    const rect = imageBoundsRef.current.getBoundingClientRect();
    setBaseImageSize({
      width: rect.width,
      height: rect.height
    });
  }, []);

  useEffect(() => {
    hasUnsavedChangesRef.current = hasUnsavedChanges;
  }, [hasUnsavedChanges]);

  useEffect(() => {
    setViewport({
      width: window.innerWidth,
      height: window.innerHeight
    });

    try {
      const storedReturnUrl = sessionStorage.getItem(RETURN_URL_KEY);
      if (storedReturnUrl) {
        returnUrlRef.current = storedReturnUrl;
      }
    } catch {
      returnUrlRef.current = DEFAULT_RETURN_URL;
    }

    try {
      const storedRect = sessionStorage.getItem(`image-rect-${image.id}`);
      if (storedRect) {
        setAnimRect(JSON.parse(storedRect) as AnimRect);
        sessionStorage.removeItem(`image-rect-${image.id}`);
      }
    } catch {
      setAnimRect(null);
    }

    requestAnimationFrame(() => {
      setShowContent(true);
      updateBaseImageSize();
    });

    const handleResize = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight
      });
      updateBaseImageSize();
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [image.id, updateBaseImageSize]);

  useEffect(() => {
    window.history.pushState({ [HISTORY_GUARD_KEY]: image.id }, "", window.location.href);

    const handlePopState = () => {
      if (hasUnsavedChangesRef.current) {
        window.history.pushState({ [HISTORY_GUARD_KEY]: image.id }, "", window.location.href);
        setShowDiscardDialog(true);
        return;
      }

      router.replace(returnUrlRef.current || DEFAULT_RETURN_URL);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [image.id, router]);

  useEffect(() => {
    setTransform({ x: 0, y: 0, scale: 1 });
    setImageLoaded(false);
    dragRef.current = getDefaultDragState();
  }, [image.id]);

  const isPannable = useMemo(() => {
    if (!containerRef.current || baseImageSize.width === 0 || baseImageSize.height === 0) {
      return false;
    }

    const rect = containerRef.current.getBoundingClientRect();
    return (
      baseImageSize.width * transform.scale > rect.width ||
      baseImageSize.height * transform.scale > rect.height
    );
  }, [baseImageSize.height, baseImageSize.width, transform.scale]);

  const imageInitial = useMemo(() => {
    if (!animRect || !viewport) {
      return { opacity: 0, scale: 0.92 };
    }

    return {
      x: animRect.x - viewport.width / 2 + animRect.width / 2,
      y: animRect.y - viewport.height / 2 + animRect.height / 2,
      scale: animRect.width / Math.min(viewport.width * 0.6, 920)
    };
  }, [animRect, viewport]);

  const navigateBackToLibrary = useCallback(() => {
    router.replace(returnUrlRef.current || DEFAULT_RETURN_URL);
  }, [router]);

  const requestClose = useCallback(() => {
    if (hasUnsavedChangesRef.current) {
      setShowDiscardDialog(true);
      return;
    }

    navigateBackToLibrary();
  }, [navigateBackToLibrary]);

  const resetZoom = useCallback(() => {
    setTransform({ x: 0, y: 0, scale: 1 });
  }, []);

  const applyZoom = useCallback(
    (nextScale: number, pointer?: { x: number; y: number }) => {
      const container = containerRef.current;
      if (!container || baseImageSize.width === 0 || baseImageSize.height === 0) {
        setTransform((current) => ({ ...current, scale: nextScale }));
        return;
      }

      const rect = container.getBoundingClientRect();
      const zoomPointer = pointer ?? { x: rect.width / 2, y: rect.height / 2 };
      const nextTransform = createWheelZoomTransform({
        current: transform,
        nextScale,
        pointer: zoomPointer,
        viewport: {
          width: rect.width,
          height: rect.height
        }
      });
      const clampedOffset = clampViewerOffset({
        ...nextTransform,
        image: baseImageSize,
        viewport: {
          width: rect.width,
          height: rect.height
        }
      });

      setTransform({
        x: clampedOffset.x,
        y: clampedOffset.y,
        scale: nextTransform.scale
      });
    },
    [baseImageSize, transform]
  );

  const handleWheel = useCallback(
    (event: React.WheelEvent<HTMLDivElement>) => {
      event.preventDefault();
      const container = containerRef.current;
      if (!container) {
        return;
      }

      const rect = container.getBoundingClientRect();
      const nextScale = Math.min(
        MAX_SCALE,
        Math.max(MIN_SCALE, transform.scale * (event.deltaY > 0 ? 0.9 : 1.1))
      );

      applyZoom(nextScale, {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      });
    },
    [applyZoom, transform.scale]
  );

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!isPannable) {
        return;
      }

      dragRef.current = {
        isDragging: true,
        startX: event.clientX,
        startY: event.clientY,
        startTransX: transform.x,
        startTransY: transform.y
      };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [isPannable, transform.x, transform.y]
  );

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.isDragging || !containerRef.current) {
      return;
    }

    const rect = containerRef.current.getBoundingClientRect();
    const nextOffset = clampViewerOffset({
      x: dragRef.current.startTransX + (event.clientX - dragRef.current.startX),
      y: dragRef.current.startTransY + (event.clientY - dragRef.current.startY),
      scale: transform.scale,
      image: baseImageSize,
      viewport: {
        width: rect.width,
        height: rect.height
      }
    });

    setTransform((current) => ({
      ...current,
      x: nextOffset.x,
      y: nextOffset.y
    }));
  }, [baseImageSize, transform.scale]);

  const handlePointerUp = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.isDragging) {
      return;
    }

    dragRef.current = getDefaultDragState();
    event.currentTarget.releasePointerCapture(event.pointerId);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (showDiscardDialog) {
          setShowDiscardDialog(false);
          return;
        }
        requestClose();
      }

      if (event.key === "0") {
        event.preventDefault();
        resetZoom();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [requestClose, resetZoom, showDiscardDialog]);

  const cursor = getViewerCursorState({
    scale: transform.scale,
    imageFitsViewport: !isPannable,
    isDragging: dragRef.current.isDragging
  });

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black lg:flex-row">
      <div className="absolute inset-0 overflow-hidden">
        <img
          src={previewUrl}
          alt=""
          className="h-full w-full object-cover"
          style={{
            filter: "blur(64px) saturate(1.15)",
            opacity: 0.38,
            transform: "scale(1.18)"
          }}
        />
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xl" />
      </div>

      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="relative z-10 flex items-center justify-between px-4 py-3 lg:px-6">
          <button
            type="button"
            onClick={requestClose}
            className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-1.5 text-xs font-medium text-white/70 transition hover:bg-white/20 hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
            关闭
          </button>

          <div className="flex items-center gap-1 rounded-full bg-black/25 px-2 py-1">
            <button
              type="button"
              onClick={() => applyZoom(Math.max(MIN_SCALE, transform.scale / 1.25))}
              className="rounded-full p-1.5 text-white/55 transition hover:bg-white/10 hover:text-white"
              aria-label="缩小"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="min-w-[3rem] text-center text-[10px] tabular-nums text-white/60">
              {Math.round(transform.scale * 100)}%
            </span>
            <button
              type="button"
              onClick={() => applyZoom(Math.min(MAX_SCALE, transform.scale * 1.25))}
              className="rounded-full p-1.5 text-white/55 transition hover:bg-white/10 hover:text-white"
              aria-label="放大"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={resetZoom}
              className="ml-1 rounded-full p-1.5 text-white/55 transition hover:bg-white/10 hover:text-white"
              aria-label="重置缩放"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div
          ref={containerRef}
          className="flex flex-1 select-none items-center justify-center overflow-hidden px-4 pb-4 lg:px-8 lg:pb-6"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onWheel={handleWheel}
          style={{ touchAction: "none", cursor }}
        >
          <motion.div
            initial={imageInitial}
            animate={showContent ? { x: 0, y: 0, scale: 1, opacity: 1 } : imageInitial}
            transition={{ duration: animRect ? 0.38 : 0.22, ease: [0.22, 1, 0.36, 1] }}
            onAnimationComplete={() => setAnimRect(null)}
            className="pointer-events-none flex items-center justify-center"
          >
            <div ref={imageBoundsRef} className="max-w-[90vw] max-h-[82vh] lg:max-w-[66vw] lg:max-h-[88vh]">
              <div
                style={{
                  transform: `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${transform.scale})`,
                  transformOrigin: "center center",
                  transition: dragRef.current.isDragging ? "none" : "transform 120ms ease-out"
                }}
              >
                <img
                  src={previewUrl}
                  alt={image.filename}
                  className="block max-h-[82vh] max-w-[90vw] rounded-lg object-contain shadow-2xl lg:max-h-[88vh] lg:max-w-[66vw]"
                  draggable={false}
                  onLoad={() => {
                    setImageLoaded(true);
                    updateBaseImageSize();
                  }}
                  style={{ opacity: imageLoaded ? 1 : 0, transition: "opacity 0.18s ease-out" }}
                />
              </div>

              {!imageLoaded ? (
                <div className="absolute left-1/2 top-1/2 flex h-32 w-32 -translate-x-1/2 -translate-y-1/2 items-center justify-center">
                  <ZoomIn className="h-8 w-8 animate-pulse text-white/40" />
                </div>
              ) : null}
            </div>
          </motion.div>
        </div>

        <div className="relative z-10 px-4 pb-3 text-center lg:px-6">
          <p className="truncate text-xs text-white/55">{image.filename}</p>
        </div>
      </div>

      <ImageDetailSidebar
        imageId={image.id}
        filename={image.filename}
        mimeType={image.mimeType}
        sizeBytes={image.sizeBytes}
        width={image.width}
        height={image.height}
        createdAt={image.createdAt}
        exif={image.exif}
        location={image.location}
        imageTags={image.tags}
        allTags={allTags}
        onDirtyChange={setHasUnsavedChanges}
      />

      {showDiscardDialog ? (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-lg border border-white/10 bg-[color:var(--bg-card)] p-5 shadow-2xl">
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-[color:var(--text-primary)]">检测到未保存更改</h2>
              <p className="text-xs leading-5 text-[color:var(--text-faint)]">
                当前对标签或位置信息的修改尚未保存，确认离开将丢失这些更改。
              </p>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDiscardDialog(false)}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-[color:var(--text-faint)] transition hover:bg-[color:var(--control-hover-bg)] hover:text-[color:var(--text-muted)]"
              >
                继续编辑
              </button>
              <button
                type="button"
                onClick={navigateBackToLibrary}
                className="rounded-lg bg-red-500/15 px-3 py-1.5 text-xs font-medium text-red-300 transition hover:bg-red-500/25 hover:text-red-200"
              >
                放弃更改
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

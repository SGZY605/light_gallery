"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Heart, Minus, Plus, RefreshCw, Trash2, X, ZoomIn } from "lucide-react";
import { ImageDetailSidebar } from "@/components/image-detail-sidebar";
import {
  IMAGE_DETAIL_RETURN_URL_KEY,
  markImageDetailReturnScrollPending
} from "@/lib/images/detail-return";
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
  featured: boolean;
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
  const downloadUrl = buildOssImageUrl(image.objectKey, "original", { publicBaseUrl });
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imageBoundsRef = useRef<HTMLDivElement | null>(null);
  const mainImageRef = useRef<HTMLImageElement | null>(null);
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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showFinalDeleteDialog, setShowFinalDeleteDialog] = useState(false);
  const [deleteConfirmationName, setDeleteConfirmationName] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFavorite, setIsFavorite] = useState(image.featured);
  const [isFavoriteUpdating, setIsFavoriteUpdating] = useState(false);

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

  const handleMainImageReady = useCallback(() => {
    setImageLoaded(true);
    updateBaseImageSize();
  }, [updateBaseImageSize]);

  useEffect(() => {
    hasUnsavedChangesRef.current = hasUnsavedChanges;
  }, [hasUnsavedChanges]);

  useEffect(() => {
    setViewport({
      width: window.innerWidth,
      height: window.innerHeight
    });

    try {
      const storedReturnUrl = sessionStorage.getItem(IMAGE_DETAIL_RETURN_URL_KEY);
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

      markImageDetailReturnScrollPending(returnUrlRef.current || DEFAULT_RETURN_URL);
      router.replace(returnUrlRef.current || DEFAULT_RETURN_URL, { scroll: false });
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [image.id, router]);

  useEffect(() => {
    setTransform({ x: 0, y: 0, scale: 1 });
    setImageLoaded(false);
    dragRef.current = getDefaultDragState();
  }, [image.id]);

  useEffect(() => {
    const imageElement = mainImageRef.current;

    if (imageElement?.complete && imageElement.naturalWidth > 0) {
      handleMainImageReady();
    }
  }, [handleMainImageReady, previewUrl]);

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
  const canConfirmImageDelete = deleteConfirmationName === image.filename;

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
    markImageDetailReturnScrollPending(returnUrlRef.current || DEFAULT_RETURN_URL);
    router.replace(returnUrlRef.current || DEFAULT_RETURN_URL, { scroll: false });
  }, [router]);

  const requestClose = useCallback(() => {
    if (hasUnsavedChangesRef.current) {
      setShowDiscardDialog(true);
      return;
    }

    navigateBackToLibrary();
  }, [navigateBackToLibrary]);

  const requestDelete = useCallback(() => {
    setDeleteError(null);
    setDeleteConfirmationName("");
    setShowDeleteDialog(true);
    setShowFinalDeleteDialog(false);
  }, []);

  const requestFinalDeleteConfirmation = useCallback(() => {
    setDeleteError(null);
    setDeleteConfirmationName("");
    setShowDeleteDialog(false);
    setShowFinalDeleteDialog(true);
  }, []);

  const toggleFavorite = useCallback(async () => {
    const nextFavorite = !isFavorite;

    setIsFavorite(nextFavorite);
    setIsFavoriteUpdating(true);

    try {
      const response = await fetch(`/api/images/${image.id}/favorite`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          featured: nextFavorite
        })
      });
      const payload = (await response.json().catch(() => null)) as { featured?: boolean; error?: string } | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "更新收藏失败。");
      }

      if (typeof payload?.featured === "boolean") {
        setIsFavorite(payload.featured);
      }

      router.refresh();
    } catch {
      setIsFavorite(!nextFavorite);
    } finally {
      setIsFavoriteUpdating(false);
    }
  }, [image.id, isFavorite, router]);

  const confirmDelete = useCallback(async () => {
    if (!canConfirmImageDelete) {
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);

    try {
      const response = await fetch(`/api/images/${image.id}`, {
        method: "DELETE"
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "删除图片失败。");
      }

      navigateBackToLibrary();
      router.refresh();
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "删除图片失败。");
    } finally {
      setIsDeleting(false);
    }
  }, [canConfirmImageDelete, image.id, navigateBackToLibrary, router]);

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
        if (showFinalDeleteDialog) {
          setShowFinalDeleteDialog(false);
          return;
        }
        if (showDeleteDialog) {
          setShowDeleteDialog(false);
          return;
        }
        requestClose();
      }

      if (event.key === "0" && !(event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)) {
        event.preventDefault();
        resetZoom();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [requestClose, resetZoom, showDeleteDialog, showDiscardDialog, showFinalDeleteDialog]);

  const cursor = getViewerCursorState({
    scale: transform.scale,
    imageFitsViewport: !isPannable,
    isDragging: dragRef.current.isDragging
  });

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black lg:flex-row">
      <div className="absolute inset-0 overflow-hidden">
        <Image
          src={previewUrl}
          alt=""
          fill
          sizes="100vw"
          unoptimized
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
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={requestClose}
              className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-1.5 text-xs font-medium text-white/70 transition hover:bg-white/20 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
              关闭
            </button>
          </div>

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
            <span className="mx-1 h-4 w-px bg-white/10" />
            <button
              type="button"
              onClick={() => void toggleFavorite()}
              disabled={isFavoriteUpdating}
              className={[
                "rounded-full p-1.5 transition disabled:cursor-not-allowed disabled:opacity-50",
                isFavorite
                  ? "text-red-400 hover:bg-red-500/15 hover:text-red-300"
                  : "text-white/55 hover:bg-white/10 hover:text-red-200"
              ].join(" ")}
              aria-label={isFavorite ? "取消收藏" : "收藏图片"}
              title={isFavorite ? "取消收藏" : "收藏图片"}
            >
              <Heart className="h-3.5 w-3.5" fill={isFavorite ? "currentColor" : "none"} />
            </button>
            <button
              type="button"
              onClick={requestDelete}
              className="rounded-full p-1.5 text-red-200/70 transition hover:bg-red-500/15 hover:text-red-100"
              aria-label="删除图片"
              title="删除图片"
            >
              <Trash2 className="h-3.5 w-3.5" />
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
                <Image
                  ref={mainImageRef}
                  src={previewUrl}
                  alt={image.filename}
                  width={image.width ?? image.exif?.width ?? 1600}
                  height={image.height ?? image.exif?.height ?? 1200}
                  sizes="(min-width: 1024px) 66vw, 90vw"
                  unoptimized
                  className="block max-h-[82vh] max-w-[90vw] object-contain lg:max-h-[88vh] lg:max-w-[66vw]"
                  draggable={false}
                  onLoad={handleMainImageReady}
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
        downloadUrl={downloadUrl}
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

      {showDeleteDialog ? (
        <div className="absolute inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-lg border border-white/10 bg-[color:var(--bg-card)] p-5 shadow-2xl">
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-[color:var(--text-primary)]">确认删除图片</h2>
              <p className="text-xs leading-5 text-[color:var(--text-faint)]">
                这会同时删除本地记录和 OSS 中的对应图片。删除后图库、相册、地图和分享中都不会再显示这张图片。
              </p>
              <p className="truncate text-xs text-[color:var(--text-secondary)]">{image.filename}</p>
            </div>

            {deleteError ? <p className="mt-3 text-xs text-red-300">{deleteError}</p> : null}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteDialog(false)}
                disabled={isDeleting}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-[color:var(--text-faint)] transition hover:bg-[color:var(--control-hover-bg)] hover:text-[color:var(--text-muted)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                取消
              </button>
              <button
                type="button"
                onClick={requestFinalDeleteConfirmation}
                disabled={isDeleting}
                className="rounded-lg bg-red-500/15 px-3 py-1.5 text-xs font-medium text-red-300 transition hover:bg-red-500/25 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-40"
              >
                继续删除
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showFinalDeleteDialog ? (
        <div className="absolute inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-lg border border-red-400/30 bg-[color:var(--bg-card)] p-6 shadow-2xl">
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-red-300">最终确认删除</h2>
              <p className="text-base font-semibold leading-7 text-[color:var(--text-primary)]">
                这一步会删除 OSS 中的原图/预览图，并删除本机数据库记录。请慎重操作！
              </p>
              <p className="truncate text-sm text-[color:var(--text-secondary)]">{image.filename}</p>
            </div>

            <label className="mt-5 block space-y-2">
              <span className="text-xs font-medium text-[color:var(--text-secondary)]">输入图片名以确认删除</span>
              <input
                value={deleteConfirmationName}
                onChange={(event) => setDeleteConfirmationName(event.target.value)}
                placeholder="输入图片名以确认删除"
                className="w-full rounded-lg border border-white/10 bg-black/10 px-3 py-2 text-sm text-[color:var(--text-primary)] outline-none transition placeholder:text-[color:var(--text-faint)] focus:border-red-400/40 focus:ring-2 focus:ring-red-500/10"
              />
            </label>

            {deleteError ? <p className="mt-4 text-sm text-red-300">{deleteError}</p> : null}

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowFinalDeleteDialog(false)}
                disabled={isDeleting}
                className="rounded-lg px-3 py-2 text-xs font-medium text-[color:var(--text-faint)] transition hover:bg-[color:var(--control-hover-bg)] hover:text-[color:var(--text-muted)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => void confirmDelete()}
                disabled={isDeleting || !canConfirmImageDelete}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isDeleting ? "删除中..." : "确认删除 OSS 和本机记录"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

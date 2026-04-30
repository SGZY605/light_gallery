"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, MapPin, Plus, RotateCcw, Save, Tag, X } from "lucide-react";
import { MiniMap } from "@/components/mini-map";
import {
  buildDetailSavePayload,
  getEditableLocationSeed,
  hasDetailDraftChanges,
  summarizeStructuredMetadata,
  validateDetailDraftLocation
} from "@/lib/images/detail-editor";

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

type ImageDetailSidebarProps = {
  imageId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  width?: number | null;
  height?: number | null;
  createdAt: string;
  exif?: ExifData | null;
  location?: LocationData | null;
  imageTags: TagItem[];
  allTags: TagItem[];
  onDirtyChange?: (dirty: boolean) => void;
};

type CoordinateErrors = {
  latitude?: string;
  longitude?: string;
};

type DraftLocationState = {
  latitude: string;
  longitude: string;
  label: string;
};

const DISPLAYED_EXIF_KEYS = new Set([
  "Make",
  "Model",
  "LensModel",
  "FocalLength",
  "FNumber",
  "ExposureTime",
  "ISO",
  "DateTimeOriginal",
  "CreateDate",
  "DateTimeDigitized",
  "ExifImageWidth",
  "ExifImageHeight",
  "ImageWidth",
  "ImageHeight",
  "Orientation",
  "GPSLatitude",
  "GPSLongitude",
  "GPSAltitude",
  "cameraMake",
  "cameraModel",
  "lensModel",
  "focalLength",
  "fNumber",
  "exposureTime",
  "iso",
  "takenAt",
  "width",
  "height",
  "orientation",
  "latitude",
  "longitude"
]);

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-[color:var(--text-muted)]">
      {children}
    </h3>
  );
}

function MetaRow({
  label,
  value
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="grid grid-cols-[92px_minmax(0,1fr)] items-start gap-3 py-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--text-faint)]">
        {label}
      </span>
      <span
        className={[
          "break-words text-right text-xs leading-5",
          value ? "text-[color:var(--text-secondary)]" : "text-[color:var(--text-faint)]"
        ].join(" ")}
      >
        {value || "—"}
      </span>
    </div>
  );
}

function RawExifDetails({ raw }: { raw: unknown }) {
  const entries = useMemo(() => {
    if (!raw || typeof raw !== "object") {
      return [];
    }

    return Object.entries(raw as Record<string, unknown>)
      .filter(([key, value]) => {
        if (DISPLAYED_EXIF_KEYS.has(key)) {
          return false;
        }

        if (value === null || value === undefined || typeof value === "object") {
          return false;
        }

        return true;
      })
      .sort(([left], [right]) => left.localeCompare(right));
  }, [raw]);

  if (entries.length === 0) {
    return null;
  }

  return (
    <details className="group rounded-lg border border-white/8 bg-black/10 px-3 py-2">
      <summary className="cursor-pointer list-none text-[11px] font-medium text-[color:var(--text-secondary)] transition group-open:mb-2">
        更多元数据
      </summary>
      <div className="space-y-1">
        {entries.map(([key, value]) => (
          <div key={key} className="grid grid-cols-[120px_minmax(0,1fr)] gap-3 py-1">
            <span className="truncate text-[10px] text-[color:var(--text-faint)]">{key}</span>
            <span className="break-words text-right text-[10px] text-[color:var(--text-secondary)]">
              {String(value)}
            </span>
          </div>
        ))}
      </div>
    </details>
  );
}

function formatCoordinate(latitude: number, longitude: number) {
  return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
}

export function ImageDetailSidebar({
  imageId,
  filename,
  mimeType,
  sizeBytes,
  width,
  height,
  createdAt,
  exif,
  location,
  imageTags,
  allTags,
  onDirtyChange
}: ImageDetailSidebarProps) {
  const toDraftLocationState = useCallback(
    (value: { latitude: string; longitude: string; label: string }): DraftLocationState => ({
      latitude: value.latitude,
      longitude: value.longitude,
      label: value.label
    }),
    []
  );

  const exifLocation = useMemo(
    () =>
      exif?.latitude != null && exif?.longitude != null
        ? { latitude: exif.latitude, longitude: exif.longitude }
        : null,
    [exif?.latitude, exif?.longitude]
  );

  const structuredMeta = useMemo(
    () =>
      summarizeStructuredMetadata({
        filename,
        mimeType,
        sizeBytes,
        width,
        height,
        createdAt,
        exif,
        location
      }),
    [createdAt, exif, filename, height, location, mimeType, sizeBytes, width]
  );

  const [savedTags, setSavedTags] = useState<TagItem[]>(imageTags);
  const [savedLocation, setSavedLocation] = useState<LocationData | null>(location ?? null);
  const [draftTagIds, setDraftTagIds] = useState<string[]>(imageTags.map((tag) => tag.id));
  const [draftLocation, setDraftLocation] = useState<DraftLocationState>(() =>
    toDraftLocationState(
      getEditableLocationSeed({
        location: location ?? null,
        exif: exifLocation
      })
    )
  );
  const [coordinateErrors, setCoordinateErrors] = useState<CoordinateErrors>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showTagMenu, setShowTagMenu] = useState(false);

  useEffect(() => {
    const nextSeed = getEditableLocationSeed({
      location: location ?? null,
      exif: exifLocation
    });

    setSavedTags(imageTags);
    setSavedLocation(location ?? null);
    setDraftTagIds(imageTags.map((tag) => tag.id));
    setDraftLocation(toDraftLocationState(nextSeed));
    setCoordinateErrors({});
    setSaveError(null);
    setShowTagMenu(false);
  }, [exifLocation, imageId, imageTags, location, toDraftLocationState]);

  const initialLocationSeed = useMemo(
    () =>
      getEditableLocationSeed({
        location: savedLocation,
        exif: exifLocation
      }),
    [exifLocation, savedLocation]
  );

  const hasUnsavedChanges = useMemo(
    () =>
      hasDetailDraftChanges({
        initialTagIds: savedTags.map((tag) => tag.id),
        draftTagIds,
        initialLocation: {
          latitude: initialLocationSeed.latitude,
          longitude: initialLocationSeed.longitude,
          label: initialLocationSeed.label
        },
        draftLocation: {
          latitude: draftLocation.latitude,
          longitude: draftLocation.longitude,
          label: draftLocation.label
        }
      }),
    [draftLocation.label, draftLocation.latitude, draftLocation.longitude, draftTagIds, initialLocationSeed, savedTags]
  );

  useEffect(() => {
    onDirtyChange?.(hasUnsavedChanges);
  }, [hasUnsavedChanges, onDirtyChange]);

  const tagLookup = useMemo(() => new Map(allTags.map((tag) => [tag.id, tag])), [allTags]);

  const selectedTags = useMemo(
    () => draftTagIds.map((tagId) => tagLookup.get(tagId)).filter(Boolean) as TagItem[],
    [draftTagIds, tagLookup]
  );

  const availableTags = useMemo(
    () => allTags.filter((tag) => !draftTagIds.includes(tag.id)),
    [allTags, draftTagIds]
  );

  const locationValidation = useMemo(
    () =>
      validateDetailDraftLocation({
        latitude: draftLocation.latitude,
        longitude: draftLocation.longitude,
        label: draftLocation.label
      }),
    [draftLocation.label, draftLocation.latitude, draftLocation.longitude]
  );

  const previewMapLocation = useMemo(() => {
    if (locationValidation.ok) {
      if (locationValidation.value) {
        return locationValidation.value;
      }

      return exifLocation;
    }

    return savedLocation ?? exifLocation;
  }, [exifLocation, locationValidation, savedLocation]);

  const handleMapChange = useCallback((latitude: number, longitude: number) => {
    setDraftLocation((current) => ({
      ...current,
      latitude: latitude.toFixed(6),
      longitude: longitude.toFixed(6)
    }));
    setCoordinateErrors({});
    setSaveError(null);
  }, []);

  const resetDraft = useCallback(() => {
    const nextSeed = toDraftLocationState(
      getEditableLocationSeed({
        location: savedLocation,
        exif: exifLocation
      })
    );

    setDraftTagIds(savedTags.map((tag) => tag.id));
    setDraftLocation(nextSeed);
    setCoordinateErrors({});
    setSaveError(null);
    setShowTagMenu(false);
  }, [exifLocation, savedLocation, savedTags, toDraftLocationState]);

  const clearManualLocationDraft = useCallback(() => {
    setDraftLocation({
      latitude: "",
      longitude: "",
      label: ""
    });
    setCoordinateErrors({});
    setSaveError(null);
  }, []);

  async function saveChanges() {
    setSaveError(null);

    const validation = validateDetailDraftLocation({
      latitude: draftLocation.latitude,
      longitude: draftLocation.longitude,
      label: draftLocation.label
    });

    if (!validation.ok) {
      setCoordinateErrors(validation.errors);
      return;
    }

    setCoordinateErrors({});
    setIsSaving(true);

    try {
      const response = await fetch(`/api/images/${imageId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          buildDetailSavePayload({
            draftTagIds,
            draftLocation: {
              latitude: draftLocation.latitude,
              longitude: draftLocation.longitude,
              label: draftLocation.label
            }
          })
        )
      });

      const payload = (await response.json().catch(() => null)) as
        | {
            error?: string;
            tags?: TagItem[];
            location?: LocationData | null;
          }
        | null;

      if (!response.ok || !payload?.tags) {
        throw new Error(payload?.error ?? "无法保存图片详情更改。");
      }

      const nextTags = payload.tags;
      const nextLocation = payload.location ?? null;
      const nextSeed = toDraftLocationState(
        getEditableLocationSeed({
          location: nextLocation,
          exif: exifLocation
        })
      );

      setSavedTags(nextTags);
      setSavedLocation(nextLocation);
      setDraftTagIds(nextTags.map((tag) => tag.id));
      setDraftLocation(nextSeed);
      setShowTagMenu(false);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "无法保存图片详情更改。");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <aside className="relative flex h-full w-full shrink-0 flex-col border-t border-white/8 bg-[color:var(--bg-card)] lg:w-[380px] lg:border-l lg:border-t-0">
      <div className="flex-1 overflow-y-auto px-5 py-5 lg:px-6">
        <section>
          <SectionTitle>文件信息</SectionTitle>
          <MetaRow label="名称" value={filename} />
          <MetaRow label="格式" value={mimeType} />
          <MetaRow label="大小" value={structuredMeta.fileSize} />
          <MetaRow label="像素" value={structuredMeta.dimensions} />
          <MetaRow label="上传时间" value={structuredMeta.createdAt} />
        </section>

        <section className="mt-5 border-t border-white/8 pt-4">
          <SectionTitle>拍摄信息</SectionTitle>
          <MetaRow label="拍摄时间" value={structuredMeta.takenAt} />
          <MetaRow
            label="EXIF GPS"
            value={exifLocation ? formatCoordinate(exifLocation.latitude, exifLocation.longitude) : null}
          />
          <MetaRow
            label="手动位置"
            value={savedLocation ? formatCoordinate(savedLocation.latitude, savedLocation.longitude) : null}
          />
          <MetaRow label="地点标签" value={savedLocation?.label ?? null} />
        </section>

        <section className="mt-5 border-t border-white/8 pt-4">
          <SectionTitle>相机与镜头</SectionTitle>
          <MetaRow label="相机" value={structuredMeta.camera} />
          <MetaRow label="镜头" value={structuredMeta.lens} />
        </section>

        <section className="mt-5 border-t border-white/8 pt-4">
          <SectionTitle>曝光参数</SectionTitle>
          <MetaRow label="焦距" value={typeof exif?.focalLength === "number" ? `${exif.focalLength}mm` : null} />
          <MetaRow label="光圈" value={typeof exif?.fNumber === "number" ? `f/${exif.fNumber}` : null} />
          <MetaRow label="快门" value={exif?.exposureTime ?? null} />
          <MetaRow label="ISO" value={typeof exif?.iso === "number" ? `ISO ${exif.iso}` : null} />
          <MetaRow label="组合" value={structuredMeta.exposure} />
        </section>

        <section className="relative mt-5 border-t border-white/8 pt-4">
          <SectionTitle>标签</SectionTitle>

          <div className="mb-3 flex flex-wrap gap-2">
            {selectedTags.length > 0 ? (
              selectedTags.map((tag) => (
                <span
                  key={tag.id}
                  className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium"
                  style={{
                    backgroundColor: tag.color ? `${tag.color}24` : "var(--control-hover-bg)",
                    color: tag.color || "var(--text-secondary)"
                  }}
                >
                  {tag.name}
                  <button
                    type="button"
                    onClick={() => setDraftTagIds((current) => current.filter((tagId) => tagId !== tag.id))}
                    className="rounded-full p-0.5 transition hover:bg-white/10"
                    aria-label={`移除标签 ${tag.name}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))
            ) : (
              <span className="text-[11px] text-[color:var(--text-faint)]">暂无标签</span>
            )}
          </div>

          <div className="relative z-30">
            <button
              type="button"
              onClick={() => setShowTagMenu((current) => !current)}
              disabled={availableTags.length === 0}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-[11px] font-medium text-[color:var(--text-secondary)] transition hover:border-white/20 hover:text-[color:var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus className="h-3 w-3" />
              添加标签
              <ChevronDown className="h-3 w-3" />
            </button>

            {showTagMenu && availableTags.length > 0 ? (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setShowTagMenu(false)} />
                <div className="absolute left-0 top-full z-30 mt-2 max-h-52 w-60 overflow-y-auto rounded-lg border border-white/10 bg-[color:var(--bg-card)] p-1 shadow-2xl">
                  {availableTags.map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => {
                        setDraftTagIds((current) => [...current, tag.id]);
                        setShowTagMenu(false);
                      }}
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs text-[color:var(--text-secondary)] transition hover:bg-[color:var(--control-hover-bg)] hover:text-[color:var(--text-primary)]"
                    >
                      <Tag className="h-3 w-3 text-[color:var(--text-faint)]" />
                      {tag.name}
                    </button>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        </section>

        <section className="mt-5 border-t border-white/8 pt-4">
          <SectionTitle>地图与位置</SectionTitle>

          <div className="mb-3 flex items-center gap-2 text-[11px] text-[color:var(--text-faint)]">
            <MapPin className="h-3.5 w-3.5" />
            <span>
              {savedLocation
                ? `当前保存位置 ${savedLocation.latitude.toFixed(4)}, ${savedLocation.longitude.toFixed(4)}`
                : exifLocation
                  ? `当前使用 EXIF GPS ${exifLocation.latitude.toFixed(4)}, ${exifLocation.longitude.toFixed(4)}`
                  : "当前没有已保存位置"}
            </span>
          </div>

          <MiniMap
            latitude={previewMapLocation?.latitude ?? null}
            longitude={previewMapLocation?.longitude ?? null}
            onLocationChange={handleMapChange}
            height={208}
          />

          <div className="mt-3 grid grid-cols-2 gap-3">
            <label className="space-y-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--text-faint)]">
                纬度
              </span>
              <input
                value={draftLocation.latitude}
                onChange={(event) => {
                  setDraftLocation((current) => ({ ...current, latitude: event.target.value }));
                  setCoordinateErrors((current) => ({ ...current, latitude: undefined }));
                  setSaveError(null);
                }}
                className="w-full rounded-lg border border-white/10 bg-black/10 px-3 py-2 text-xs text-[color:var(--text-primary)] outline-none transition focus:border-white/30 focus:ring-2 focus:ring-white/10"
                placeholder="31.230400"
              />
              {coordinateErrors.latitude ? (
                <p className="text-[11px] text-red-300">{coordinateErrors.latitude}</p>
              ) : null}
            </label>

            <label className="space-y-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--text-faint)]">
                经度
              </span>
              <input
                value={draftLocation.longitude}
                onChange={(event) => {
                  setDraftLocation((current) => ({ ...current, longitude: event.target.value }));
                  setCoordinateErrors((current) => ({ ...current, longitude: undefined }));
                  setSaveError(null);
                }}
                className="w-full rounded-lg border border-white/10 bg-black/10 px-3 py-2 text-xs text-[color:var(--text-primary)] outline-none transition focus:border-white/30 focus:ring-2 focus:ring-white/10"
                placeholder="121.473700"
              />
              {coordinateErrors.longitude ? (
                <p className="text-[11px] text-red-300">{coordinateErrors.longitude}</p>
              ) : null}
            </label>
          </div>

          <label className="mt-3 block space-y-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--text-faint)]">
              地点标签
            </span>
            <input
              value={draftLocation.label}
              onChange={(event) => {
                setDraftLocation((current) => ({ ...current, label: event.target.value }));
                setSaveError(null);
              }}
              className="w-full rounded-lg border border-white/10 bg-black/10 px-3 py-2 text-xs text-[color:var(--text-primary)] outline-none transition focus:border-white/30 focus:ring-2 focus:ring-white/10"
              placeholder="可选地点名称"
            />
          </label>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={clearManualLocationDraft}
              className="rounded-full border border-white/10 px-3 py-1.5 text-[11px] font-medium text-[color:var(--text-secondary)] transition hover:border-white/20 hover:text-[color:var(--text-primary)]"
            >
              清除手动位置
            </button>
            <button
              type="button"
              onClick={resetDraft}
              disabled={!hasUnsavedChanges || isSaving}
              className="inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-1.5 text-[11px] font-medium text-[color:var(--text-secondary)] transition hover:border-white/20 hover:text-[color:var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <RotateCcw className="h-3 w-3" />
              重置草稿
            </button>
          </div>
        </section>

        <section className="mt-5 border-t border-white/8 pt-4">
          <RawExifDetails raw={exif?.raw} />
        </section>
      </div>

      <div className="border-t border-white/8 bg-black/10 px-5 py-4 lg:px-6">
        {saveError ? <p className="mb-3 text-xs text-red-300">{saveError}</p> : null}
        <div className="mb-3 flex items-center justify-between text-[11px]">
          <span className={hasUnsavedChanges ? "text-amber-300" : "text-[color:var(--text-faint)]"}>
            {hasUnsavedChanges ? "有未保存更改" : "已与当前保存状态同步"}
          </span>
          <span className="text-[color:var(--text-faint)]">
            {selectedTags.length} 个标签
          </span>
        </div>
        <button
          type="button"
          onClick={() => void saveChanges()}
          disabled={isSaving || !hasUnsavedChanges}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-white/12 px-4 py-2.5 text-sm font-semibold text-[color:var(--text-primary)] transition hover:bg-white/18 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Save className="h-4 w-4" />
          {isSaving ? "保存中..." : "保存更改"}
        </button>
      </div>
    </aside>
  );
}

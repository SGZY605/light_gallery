"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";

type LocationEditorProps = {
  imageId: string;
  fallbackLocation?: {
    latitude: number;
    longitude: number;
    label?: string | null;
  } | null;
  overrideLocation?: {
    latitude: number;
    longitude: number;
    label?: string | null;
  } | null;
};

export function LocationEditor({
  imageId,
  fallbackLocation = null,
  overrideLocation = null
}: LocationEditorProps) {
  const router = useRouter();
  const [latitude, setLatitude] = useState(String(overrideLocation?.latitude ?? fallbackLocation?.latitude ?? ""));
  const [longitude, setLongitude] = useState(String(overrideLocation?.longitude ?? fallbackLocation?.longitude ?? ""));
  const [label, setLabel] = useState(overrideLocation?.label ?? fallbackLocation?.label ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function saveLocation() {
    setError(null);
    setIsSaving(true);

    try {
      const response = await fetch(`/api/images/${imageId}/location`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          latitude: Number(latitude),
          longitude: Number(longitude),
          label: label.trim() || undefined
        })
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "无法保存位置。");
      }

      startTransition(() => {
        router.refresh();
      });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "无法保存位置。");
    } finally {
      setIsSaving(false);
    }
  }

  async function clearLocation() {
    setError(null);
    setIsSaving(true);

    try {
      const response = await fetch(`/api/images/${imageId}/location`, {
        method: "DELETE"
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "无法清除位置。");
      }

      setLabel(fallbackLocation?.label ?? "");
      setLatitude(String(fallbackLocation?.latitude ?? ""));
      setLongitude(String(fallbackLocation?.longitude ?? ""));
      startTransition(() => {
        router.refresh();
      });
    } catch (clearError) {
      setError(clearError instanceof Error ? clearError.message : "无法清除位置。");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/50">位置覆盖</p>
        <p className="mt-2 text-sm text-white/70">手动坐标在有两者时优先于 EXIF GPS。</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">纬度</span>
          <input
            value={latitude}
            onChange={(event) => setLatitude(event.target.value)}
            className="w-full rounded-2xl border border-border bg-transparent px-4 py-3 text-sm text-white/90 outline-none transition focus:border-white/30 focus:ring-2 focus:ring-white/10"
          />
        </label>
        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">经度</span>
          <input
            value={longitude}
            onChange={(event) => setLongitude(event.target.value)}
            className="w-full rounded-2xl border border-border bg-transparent px-4 py-3 text-sm text-white/90 outline-none transition focus:border-white/30 focus:ring-2 focus:ring-white/10"
          />
        </label>
      </div>

      <label className="block space-y-2">
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">标签</span>
        <input
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          className="w-full rounded-2xl border border-border bg-transparent px-4 py-3 text-sm text-white/90 outline-none transition focus:border-white/30 focus:ring-2 focus:ring-white/10"
          placeholder="可选地点标签"
        />
      </label>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            void saveLocation();
          }}
          disabled={isSaving}
          className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isSaving ? "保存中..." : "保存位置"}
        </button>

        <button
          type="button"
          onClick={() => {
            void clearLocation();
          }}
          disabled={isSaving}
          className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-white/70 transition hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          清除覆盖
        </button>
      </div>
    </div>
  );
}

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
        throw new Error(payload?.error ?? "无法清除位置覆盖。");
      }

      setLabel(fallbackLocation?.label ?? "");
      setLatitude(String(fallbackLocation?.latitude ?? ""));
      setLongitude(String(fallbackLocation?.longitude ?? ""));
      startTransition(() => {
        router.refresh();
      });
    } catch (clearError) {
      setError(clearError instanceof Error ? clearError.message : "无法清除位置覆盖。");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">位置覆盖</p>
        <p className="mt-2 text-sm text-slate-600">当手动坐标和 EXIF GPS 同时存在时，系统会优先使用手动坐标。</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">纬度</span>
          <input
            value={latitude}
            onChange={(event) => setLatitude(event.target.value)}
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
          />
        </label>
        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">经度</span>
          <input
            value={longitude}
            onChange={(event) => setLongitude(event.target.value)}
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
          />
        </label>
      </div>

      <label className="block space-y-2">
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">地点名称</span>
        <input
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
          placeholder="可选地点名称"
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
          className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {isSaving ? "保存中..." : "保存位置"}
        </button>

        <button
          type="button"
          onClick={() => {
            void clearLocation();
          }}
          disabled={isSaving}
          className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-950 hover:text-slate-950 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
        >
          清除覆盖
        </button>
      </div>
    </div>
  );
}

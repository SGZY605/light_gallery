"use client";

import { startTransition, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { parse } from "exifr";
import { useDropzone } from "react-dropzone";

type AvailableTag = {
  id: string;
  name: string;
  slug: string;
};

type UploadStatus = "queued" | "signing" | "uploading" | "saving" | "complete" | "failed";

type UploadQueueItem = {
  id: string;
  file: File;
  filename: string;
  sizeBytes: number;
  mimeType: string;
  width: number | null;
  height: number | null;
  exif: unknown;
  status: UploadStatus;
  error: string | null;
};

type UploadSignatureResponse = {
  expiresAt: string;
  fields: Record<string, string>;
  uploadUrl: string;
};

type UploadDropzoneProps = {
  availableTags: AvailableTag[];
};

function formatBytes(sizeBytes: number): string {
  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }

  if (sizeBytes < 1024 * 1024) {
    return `${(sizeBytes / 1024).toFixed(1)} KB`;
  }

  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function readImageDimensions(file: File): Promise<{ width: number | null; height: number | null }> {
  if ("createImageBitmap" in window) {
    try {
      const bitmap = await createImageBitmap(file);
      const dimensions = { width: bitmap.width, height: bitmap.height };
      bitmap.close();
      return dimensions;
    } catch {
      // Fall through to the Image element path.
    }
  }

  return new Promise((resolve) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
      URL.revokeObjectURL(objectUrl);
    };

    image.onerror = () => {
      resolve({ width: null, height: null });
      URL.revokeObjectURL(objectUrl);
    };

    image.src = objectUrl;
  });
}

async function parseExif(file: File): Promise<unknown> {
  try {
    return await parse(file, {
      gps: true
    });
  } catch {
    return null;
  }
}

function parseTagNames(input: string): string[] {
  return Array.from(
    new Set(
      input
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)
    )
  );
}

export function UploadDropzone({ availableTags }: UploadDropzoneProps) {
  const router = useRouter();
  const [defaultTagIds, setDefaultTagIds] = useState<string[]>([]);
  const [newTagNames, setNewTagNames] = useState("");
  const [description, setDescription] = useState("");
  const [queue, setQueue] = useState<UploadQueueItem[]>([]);
  const completedCount = useMemo(
    () => queue.filter((item) => item.status === "complete").length,
    [queue]
  );

  function updateQueueItem(id: string, updates: Partial<UploadQueueItem>) {
    setQueue((currentQueue) =>
      currentQueue.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  }

  async function requestSignature(file: File): Promise<UploadSignatureResponse> {
    const response = await fetch("/api/uploads/sign", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        filename: file.name,
        mimeType: file.type,
        sizeBytes: file.size
      })
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(payload?.error ?? "Failed to create an upload signature.");
    }

    return (await response.json()) as UploadSignatureResponse;
  }

  async function uploadFileToOss(signature: UploadSignatureResponse, file: File) {
    const formData = new FormData();

    Object.entries(signature.fields).forEach(([key, value]) => {
      formData.append(key, value);
    });

    formData.append("file", file);

    const response = await fetch(signature.uploadUrl, {
      method: "POST",
      body: formData
    });

    if (!response.ok) {
      throw new Error("Direct upload to OSS failed.");
    }
  }

  async function completeUpload(item: UploadQueueItem, objectKey: string) {
    const response = await fetch("/api/uploads/complete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        objectKey,
        filename: item.filename,
        mimeType: item.mimeType,
        sizeBytes: item.sizeBytes,
        width: item.width ?? undefined,
        height: item.height ?? undefined,
        description: description.trim() || undefined,
        exif: item.exif,
        tagIds: defaultTagIds,
        tagNames: parseTagNames(newTagNames)
      })
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(payload?.error ?? "Failed to persist image metadata.");
    }
  }

  async function processItem(item: UploadQueueItem) {
    try {
      updateQueueItem(item.id, { status: "signing", error: null });
      const signature = await requestSignature(item.file);
      const objectKey = signature.fields.key;

      updateQueueItem(item.id, { status: "uploading" });
      await uploadFileToOss(signature, item.file);

      updateQueueItem(item.id, { status: "saving" });
      await completeUpload(item, objectKey);

      updateQueueItem(item.id, { status: "complete" });
      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      updateQueueItem(item.id, {
        status: "failed",
        error: error instanceof Error ? error.message : "Upload failed."
      });
    }
  }

  async function enqueueFiles(files: File[]) {
    const preparedItems = await Promise.all(
      files.map(async (file) => {
        const [dimensions, exif] = await Promise.all([readImageDimensions(file), parseExif(file)]);

        return {
          id: globalThis.crypto.randomUUID(),
          file,
          filename: file.name,
          sizeBytes: file.size,
          mimeType: file.type,
          width: dimensions.width,
          height: dimensions.height,
          exif,
          status: "queued" as const,
          error: null
        };
      })
    );

    setQueue((currentQueue) => [...currentQueue, ...preparedItems]);

    for (const item of preparedItems) {
      await processItem(item);
    }
  }

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    accept: {
      "image/*": []
    },
    noClick: true,
    multiple: true,
    onDrop: (acceptedFiles) => {
      void enqueueFiles(acceptedFiles);
    }
  });

  function toggleTag(tagId: string) {
    setDefaultTagIds((currentTagIds) =>
      currentTagIds.includes(tagId)
        ? currentTagIds.filter((currentTagId) => currentTagId !== tagId)
        : [...currentTagIds, tagId]
    );
  }

  return (
    <div className="space-y-8">
      <section className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div
          {...getRootProps()}
          className={[
            "rounded-[32px] border border-dashed px-8 py-14 transition",
            isDragActive
              ? "border-amber-400 bg-amber-500/10"
              : "border-border bg-card shadow-[0_22px_70px_rgba(15,23,42,0.08)]"
          ].join(" ")}
        >
          <input {...getInputProps()} />
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-amber-600">
              Direct To OSS
            </p>
            <h2 className="mt-4 text-3xl font-semibold text-white/90">
              Drop original photos here and let the browser handle the heavy lift.
            </h2>
            <p className="mt-4 text-sm leading-6 text-white/70">
              EXIF is parsed locally, originals go straight to OSS, and metadata lands in the app after upload.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={open}
                className="rounded-full bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
              >
                Choose photos
              </button>
              <span className="text-sm text-white/50">or drag multiple files into this area</span>
            </div>
          </div>
        </div>

        <aside className="space-y-5 rounded-[32px] border border-border bg-card p-6 shadow-[0_22px_70px_rgba(15,23,42,0.08)]">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-white/50">Default Metadata</p>
            <h3 className="text-lg font-semibold text-white/90">Tags and description</h3>
          </div>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-white/70">Description</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={4}
              className="w-full rounded-2xl border border-border bg-transparent px-4 py-3 text-sm text-white/90 outline-none transition focus:border-white/30 focus:ring-2 focus:ring-white/10"
              placeholder="Optional caption applied to each queued upload"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-white/70">Create tags</span>
            <input
              value={newTagNames}
              onChange={(event) => setNewTagNames(event.target.value)}
              className="w-full rounded-2xl border border-border bg-transparent px-4 py-3 text-sm text-white/90 outline-none transition focus:border-white/30 focus:ring-2 focus:ring-white/10"
              placeholder="travel, family, favorites"
            />
          </label>

          <div className="space-y-3">
            <span className="text-sm font-medium text-white/70">Attach existing tags</span>
            <div className="flex flex-wrap gap-2">
              {availableTags.map((tag) => {
                const selected = defaultTagIds.includes(tag.id);

                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleTag(tag.id)}
                    className={[
                      "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                      selected
                        ? "border-white/10 bg-white/10 text-white"
                        : "border-border bg-surface text-white/70 hover:border-white/20"
                    ].join(" ")}
                  >
                    {tag.name}
                  </button>
                );
              })}
            </div>
          </div>
        </aside>
      </section>

      <section className="rounded-[32px] border border-border bg-card p-6 shadow-[0_22px_70px_rgba(15,23,42,0.08)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-white/50">Queue</p>
            <h3 className="mt-2 text-lg font-semibold text-white/90">Upload status</h3>
          </div>
          <p className="text-sm text-white/50">
            {completedCount} complete / {queue.length} queued
          </p>
        </div>

        {queue.length ? (
          <div className="mt-6 space-y-3">
            {queue.map((item) => (
              <article
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-surface px-4 py-4"
              >
                <div className="space-y-1">
                  <p className="font-medium text-white/90">{item.filename}</p>
                  <p className="text-xs text-white/50">
                    {formatBytes(item.sizeBytes)}
                    {item.width && item.height ? ` • ${item.width}×${item.height}` : ""}
                  </p>
                  {item.error ? <p className="text-xs text-red-600">{item.error}</p> : null}
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={[
                      "rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]",
                      item.status === "complete"
                        ? "bg-emerald-100 text-emerald-700"
                        : item.status === "failed"
                          ? "bg-red-100 text-red-700"
                          : "bg-white/10 text-white/70"
                    ].join(" ")}
                  >
                    {item.status}
                  </span>

                  {item.status === "failed" ? (
                    <button
                      type="button"
                      onClick={() => {
                        void processItem(item);
                      }}
                      className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-white/70 transition hover:border-white/20 hover:text-white"
                    >
                      Retry
                    </button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-dashed border-border px-6 py-12 text-center text-sm text-white/50">
            Your upload queue is empty.
          </div>
        )}
      </section>
    </div>
  );
}

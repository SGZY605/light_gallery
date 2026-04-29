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
        error: error instanceof Error ? error.message : "上传失败"
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
    <div className="space-y-6">
      <section className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <div
          {...getRootProps()}
          className={[
            "rounded-2xl border border-dashed px-6 py-10 transition",
            isDragActive
              ? "border-white/20 bg-white/[0.02]"
              : "border-white/[0.06] bg-transparent"
          ].join(" ")}
        >
          <input {...getInputProps()} />
          <div className="mx-auto max-w-xl text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/30">
              直接上传至 OSS
            </p>
            <h2 className="mt-2 text-lg font-semibold text-white/50">
              将原始照片拖放到此处。
            </h2>
            <p className="mt-2 text-xs leading-5 text-white/30">
              EXIF 在本地解析，原始文件直接上传至 OSS，上传后元数据录入应用。
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={open}
                className="rounded-full bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-white/50 transition hover:bg-white/15 hover:text-white/80"
              >
                选择照片
              </button>
              <span className="text-[10px] text-white/20">或将多个文件拖入此区域</span>
            </div>
          </div>
        </div>

        <aside className="space-y-4 rounded-2xl border border-white/[0.06] bg-transparent p-5">
          <div className="space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/25">默认元数据</p>
            <h3 className="text-sm font-semibold text-white/50">标签与描述</h3>
          </div>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-white/40">描述</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              className="w-full rounded-xl border border-white/[0.06] bg-transparent px-3 py-2 text-xs text-white/70 outline-none transition focus:border-white/20 focus:ring-1 focus:ring-white/10"
              placeholder="应用于每个队列上传的可选说明"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-white/40">创建标签</span>
            <input
              value={newTagNames}
              onChange={(event) => setNewTagNames(event.target.value)}
              className="w-full rounded-xl border border-white/[0.06] bg-transparent px-3 py-2 text-xs text-white/70 outline-none transition focus:border-white/20 focus:ring-1 focus:ring-white/10"
              placeholder="旅行, 家庭, 收藏"
            />
          </label>

          <div className="space-y-2">
            <span className="text-xs font-medium text-white/40">附加已有标签</span>
            <div className="flex flex-wrap gap-1.5">
              {availableTags.map((tag) => {
                const selected = defaultTagIds.includes(tag.id);

                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleTag(tag.id)}
                    className={[
                      "rounded-full border px-2 py-0.5 text-[10px] font-semibold transition",
                      selected
                        ? "border-white/15 bg-white/10 text-white/70"
                        : "border-white/[0.04] text-white/30 hover:border-white/15 hover:text-white/60"
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

      <section className="rounded-2xl border border-white/[0.06] bg-transparent p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.04] pb-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/25">队列</p>
            <h3 className="mt-1 text-sm font-semibold text-white/50">上传状态</h3>
          </div>
          <p className="text-xs text-white/30">
            {completedCount} 已完成 / {queue.length} 排队中
          </p>
        </div>

        {queue.length ? (
          <div className="mt-5 space-y-2">
            {queue.map((item) => (
              <article
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/[0.04] bg-transparent px-3 py-3"
              >
                <div className="space-y-0.5">
                  <p className="text-xs font-medium text-white/60">{item.filename}</p>
                  <p className="text-[10px] text-white/25">
                    {formatBytes(item.sizeBytes)}
                    {item.width && item.height ? ` • ${item.width}×${item.height}` : ""}
                  </p>
                  {item.error ? <p className="text-[10px] text-red-400">{item.error}</p> : null}
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={[
                      "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]",
                      item.status === "complete"
                        ? "bg-emerald-500/15 text-emerald-400/80"
                        : item.status === "failed"
                          ? "bg-red-500/15 text-red-400/80"
                          : "bg-white/[0.04] text-white/40"
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
                      className="rounded-full border border-white/[0.06] px-2 py-0.5 text-[10px] font-medium text-white/40 transition hover:border-white/20 hover:text-white/70"
                    >
                      重试
                    </button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-xl border border-dashed border-white/[0.04] px-6 py-10 text-center text-xs text-white/20">
            上传队列为空。
          </div>
        )}
      </section>
    </div>
  );
}

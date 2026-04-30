"use client";

import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { parse } from "exifr";
import { useDropzone } from "react-dropzone";
import {
  buildQueueTagPayload,
  createQueueTagDraft,
  getEditableQueueTagNames,
  getEffectiveQueueTags,
  parseQueueTagNames,
  selectQueueItemNamedTags,
  toggleQueueItemExistingTag,
  toggleQueueItemNamedTag,
  type QueueTagDraft
} from "@/lib/uploads/queue-tags";

type AvailableTag = {
  id: string;
  name: string;
  slug: string;
};

type UploadStatus = "ready" | "signing" | "uploading" | "saving" | "complete" | "failed";

type UploadQueueItem = {
  id: string;
  file: File;
  filename: string;
  sizeBytes: number;
  mimeType: string;
  width: number | null;
  height: number | null;
  exif: unknown;
  thumbnailUrl: string;
  status: UploadStatus;
  error: string | null;
  tagDraft: QueueTagDraft;
  tagInput: string;
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

function getTagNameKey(tagName: string): string {
  return tagName.trim().toLocaleLowerCase();
}

function hasNamedTag(tagNames: string[], tagName: string): boolean {
  const key = getTagNameKey(tagName);
  return tagNames.some((currentTagName) => getTagNameKey(currentTagName) === key);
}

function isEditableStatus(status: UploadStatus): boolean {
  return status === "ready" || status === "failed";
}

function getTagToggleClassName({
  selected,
  defaultSelected,
  removedDefault
}: {
  selected: boolean;
  defaultSelected: boolean;
  removedDefault: boolean;
}): string {
  if (removedDefault) {
    return "border-white/[0.06] bg-transparent text-white/20 line-through hover:border-white/12 hover:text-white/35";
  }

  if (selected && !defaultSelected) {
    return "border-emerald-400/30 bg-emerald-500/10 text-emerald-200 hover:border-emerald-300/45";
  }

  if (selected) {
    return "border-white/15 bg-white/10 text-white/70 hover:bg-white/15";
  }

  return "border-white/[0.04] text-white/30 hover:border-white/15 hover:text-white/60";
}

function getAppliedTagPillClassName(isCustom: boolean): string {
  return isCustom
    ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-200"
    : "border-white/12 bg-white/[0.06] text-white/65";
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

export function UploadDropzone({ availableTags }: UploadDropzoneProps) {
  const router = useRouter();
  const [defaultTagIds, setDefaultTagIds] = useState<string[]>([]);
  const [newTagNames, setNewTagNames] = useState("");
  const [description, setDescription] = useState("");
  const [queue, setQueue] = useState<UploadQueueItem[]>([]);
  const defaultTagNames = useMemo(() => parseQueueTagNames(newTagNames), [newTagNames]);
  const completedCount = useMemo(
    () => queue.filter((item) => item.status === "complete").length,
    [queue]
  );
  const queueRef = useRef(queue);
  queueRef.current = queue;

  useEffect(() => {
    return () => {
      for (const item of queueRef.current) {
        URL.revokeObjectURL(item.thumbnailUrl);
      }
    };
  }, []);

  const readyCount = useMemo(
    () => queue.filter((item) => item.status === "ready").length,
    [queue]
  );
  const isUploading = useMemo(
    () => queue.some((item) => item.status === "uploading" || item.status === "signing" || item.status === "saving"),
    [queue]
  );

  function updateQueueItem(id: string, updates: Partial<UploadQueueItem>) {
    setQueue((currentQueue) =>
      currentQueue.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  }

  function updateQueueItemDraft(id: string, updateDraft: (draft: QueueTagDraft) => QueueTagDraft) {
    setQueue((currentQueue) =>
      currentQueue.map((item) =>
        item.id === id
          ? {
              ...item,
              tagDraft: updateDraft(item.tagDraft)
            }
          : item
      )
    );
  }

  function removeFromQueue(id: string) {
    setQueue((currentQueue) => {
      const item = currentQueue.find((currentItem) => currentItem.id === id);
      if (item) {
        URL.revokeObjectURL(item.thumbnailUrl);
      }

      return currentQueue.filter((currentItem) => currentItem.id !== id);
    });
  }

  async function uploadFileThroughServer(item: UploadQueueItem) {
    const formData = new FormData();
    const tagPayload = buildQueueTagPayload({
      defaultTagIds,
      defaultTagNames,
      draft: item.tagDraft
    });

    formData.append("file", item.file);
    formData.append("filename", item.filename);
    formData.append("mimeType", item.mimeType);
    formData.append("sizeBytes", String(item.sizeBytes));

    if (item.width) {
      formData.append("width", String(item.width));
    }

    if (item.height) {
      formData.append("height", String(item.height));
    }

    if (description.trim()) {
      formData.append("description", description.trim());
    }

    if (item.exif) {
      formData.append("exif", JSON.stringify(item.exif));
    }

    formData.append("tagIds", JSON.stringify(tagPayload.tagIds));
    formData.append("tagNames", JSON.stringify(tagPayload.tagNames));

    const response = await fetch("/api/uploads/proxy", {
      method: "POST",
      body: formData
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(payload?.error ?? "Failed to upload image.");
    }
  }

  async function processItem(item: UploadQueueItem) {
    try {
      updateQueueItem(item.id, { status: "uploading" });
      await uploadFileThroughServer(item);

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
          thumbnailUrl: URL.createObjectURL(file),
          status: "ready" as const,
          error: null,
          tagDraft: createQueueTagDraft(),
          tagInput: ""
        };
      })
    );

    setQueue((currentQueue) => [...currentQueue, ...preparedItems]);
  }

  async function uploadAll() {
    const readyItems = queue.filter((item) => item.status === "ready");
    for (const item of readyItems) {
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

  function toggleDefaultTag(tagId: string) {
    setDefaultTagIds((currentTagIds) =>
      currentTagIds.includes(tagId)
        ? currentTagIds.filter((currentTagId) => currentTagId !== tagId)
        : [...currentTagIds, tagId]
    );
  }

  function toggleItemExistingTag(itemId: string, tagId: string, defaultSelected: boolean) {
    updateQueueItemDraft(itemId, (draft) =>
      toggleQueueItemExistingTag({
        tagId,
        defaultSelected,
        draft
      })
    );
  }

  function toggleItemTextTag(itemId: string, tagName: string, defaultSelected: boolean) {
    updateQueueItemDraft(itemId, (draft) =>
      toggleQueueItemNamedTag({
        tagName,
        defaultSelected,
        draft
      })
    );
  }

  function addItemTextTags(itemId: string) {
    setQueue((currentQueue) =>
      currentQueue.map((item) => {
        if (item.id !== itemId) {
          return item;
        }

        const tagNames = parseQueueTagNames(item.tagInput);
        if (!tagNames.length) {
          return item;
        }

        return {
          ...item,
          tagDraft: selectQueueItemNamedTags(item.tagDraft, tagNames, defaultTagNames),
          tagInput: ""
        };
      })
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
              将原始照片拖放到此处
            </h2>
            <p className="mt-2 text-xs leading-5 text-white/30">
              EXIF 在本地解析，原始文件直接上传至 OSS，上传后元数据录入应用。
            </p>
            <button
              type="button"
              onClick={open}
              className="mt-6 inline-flex items-center justify-center rounded-2xl bg-white/[0.08] px-8 py-3 text-sm font-medium text-white/60 transition hover:bg-white/15 hover:text-white/80"
            >
              选择照片
            </button>
            <p className="mt-2 text-[10px] text-white/20">或将多个文件拖入此区域</p>
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
              placeholder="应用于这一批上传图片的可选描述"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-white/40">批量新标签</span>
            <input
              value={newTagNames}
              onChange={(event) => setNewTagNames(event.target.value)}
              className="w-full rounded-xl border border-white/[0.06] bg-transparent px-3 py-2 text-xs text-white/70 outline-none transition focus:border-white/20 focus:ring-1 focus:ring-white/10"
              placeholder="旅行, 家庭, 收藏"
            />
          </label>

          {defaultTagNames.length > 0 ? (
            <div className="space-y-2">
              <span className="text-xs font-medium text-white/40">批量文本标签</span>
              <div className="flex flex-wrap gap-1.5">
                {defaultTagNames.map((tagName) => (
                  <span
                    key={tagName}
                    className="rounded-full border border-white/12 bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold text-white/65"
                  >
                    {tagName}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            <span className="text-xs font-medium text-white/40">附加已有标签</span>
            <div className="flex flex-wrap gap-1.5">
              {availableTags.map((tag) => {
                const selected = defaultTagIds.includes(tag.id);

                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleDefaultTag(tag.id)}
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
          <div className="flex items-center gap-3">
            <p className="text-xs text-white/30">
              {readyCount} 待上传 / {completedCount} 已完成 / {queue.length} 总计
            </p>
            {readyCount > 0 && (
              <button
                type="button"
                onClick={() => void uploadAll()}
                disabled={isUploading}
                className="rounded-2xl bg-white/[0.08] px-8 py-3 text-sm font-semibold text-white/60 transition hover:bg-white/15 hover:text-white/80 disabled:cursor-not-allowed disabled:opacity-40"
              >
                上传全部
              </button>
            )}
          </div>
        </div>

        {queue.length ? (
          <div className="mt-5 space-y-3">
            {queue.map((item) => {
              const editable = isEditableStatus(item.status);
              const effectiveTags = getEffectiveQueueTags({
                defaultTagIds,
                defaultTagNames,
                draft: item.tagDraft
              });
              const editableTextTags = getEditableQueueTagNames({
                defaultTagNames,
                draft: item.tagDraft
              });
              const selectedExistingTags = availableTags.filter((tag) =>
                effectiveTags.tagIds.includes(tag.id)
              );

              return (
                <article
                  key={item.id}
                  className="rounded-xl border border-white/[0.04] bg-transparent px-4 py-4"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start">
                    <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-xl bg-white/[0.03]">
                      <img
                        src={item.thumbnailUrl}
                        alt={item.filename}
                        className="h-full w-full object-cover"
                      />
                    </div>

                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="space-y-1">
                        <p className="truncate text-sm font-medium text-white/70">{item.filename}</p>
                        <p className="text-xs text-white/25">
                          {formatBytes(item.sizeBytes)}
                          {item.width && item.height ? ` · ${item.width}x${item.height}` : ""}
                        </p>
                        {item.error ? <p className="text-xs text-red-400">{item.error}</p> : null}
                      </div>

                      <div className="space-y-1.5">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/25">
                          已生效标签
                        </p>
                        {selectedExistingTags.length || effectiveTags.tagNames.length ? (
                          <div className="flex flex-wrap gap-1.5">
                            {selectedExistingTags.map((tag) => {
                              const isCustom = item.tagDraft.addedTagIds.includes(tag.id);

                              return (
                                <span
                                  key={tag.id}
                                  className={[
                                    "rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                                    getAppliedTagPillClassName(isCustom)
                                  ].join(" ")}
                                >
                                  {tag.name}
                                </span>
                              );
                            })}
                            {effectiveTags.tagNames.map((tagName) => {
                              const isCustom = hasNamedTag(item.tagDraft.addedTagNames, tagName);

                              return (
                                <span
                                  key={tagName}
                                  className={[
                                    "rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                                    getAppliedTagPillClassName(isCustom)
                                  ].join(" ")}
                                >
                                  {tagName}
                                </span>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-xs text-white/20">当前未设置标签</p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-shrink-0 items-center gap-2 self-start">
                      <span
                        className={[
                          "rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.14em]",
                          item.status === "complete"
                            ? "bg-emerald-500/15 text-emerald-400/80"
                            : item.status === "failed"
                              ? "bg-red-500/15 text-red-400/80"
                              : item.status === "ready"
                                ? "bg-blue-500/15 text-blue-400/80"
                                : "bg-white/[0.04] text-white/40"
                        ].join(" ")}
                      >
                        {item.status === "ready" ? "待上传" : item.status}
                      </span>

                      {item.status === "failed" ? (
                        <button
                          type="button"
                          onClick={() => {
                            void processItem(item);
                          }}
                          className="rounded-full border border-white/[0.06] px-2.5 py-1 text-xs font-medium text-white/40 transition hover:border-white/20 hover:text-white/70"
                        >
                          重试
                        </button>
                      ) : null}

                      {editable ? (
                        <button
                          type="button"
                          onClick={() => removeFromQueue(item.id)}
                          className="flex h-7 w-7 items-center justify-center rounded-full text-white/25 transition hover:bg-white/[0.08] hover:text-white/60"
                          aria-label="移除"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      ) : null}
                    </div>
                  </div>

                  {editable ? (
                    <div className="mt-4 space-y-3 border-t border-white/[0.04] pt-4">
                      <div className="space-y-2">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/25">
                          单图已有标签
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {availableTags.map((tag) => {
                            const defaultSelected = defaultTagIds.includes(tag.id);
                            const removedDefault = item.tagDraft.removedDefaultTagIds.includes(tag.id);
                            const selected = effectiveTags.tagIds.includes(tag.id);

                            return (
                              <button
                                key={tag.id}
                                type="button"
                                onClick={() => toggleItemExistingTag(item.id, tag.id, defaultSelected)}
                                className={[
                                  "rounded-full border px-2 py-0.5 text-[10px] font-semibold transition",
                                  getTagToggleClassName({
                                    selected,
                                    defaultSelected,
                                    removedDefault
                                  })
                                ].join(" ")}
                              >
                                {tag.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/25">
                          单图文本标签
                        </p>

                        {editableTextTags.length ? (
                          <div className="flex flex-wrap gap-1.5">
                            {editableTextTags.map((tagName) => {
                              const defaultSelected = hasNamedTag(defaultTagNames, tagName);
                              const removedDefault = hasNamedTag(
                                item.tagDraft.removedDefaultTagNames,
                                tagName
                              );
                              const selected = hasNamedTag(effectiveTags.tagNames, tagName);

                              return (
                                <button
                                  key={tagName}
                                  type="button"
                                  onClick={() => toggleItemTextTag(item.id, tagName, defaultSelected)}
                                  className={[
                                    "rounded-full border px-2 py-0.5 text-[10px] font-semibold transition",
                                    getTagToggleClassName({
                                      selected,
                                      defaultSelected,
                                      removedDefault
                                    })
                                  ].join(" ")}
                                >
                                  {tagName}
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-xs text-white/20">还没有单图文本标签</p>
                        )}

                        <div className="flex flex-col gap-2 sm:flex-row">
                          <input
                            value={item.tagInput}
                            onChange={(event) => updateQueueItem(item.id, { tagInput: event.target.value })}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                addItemTextTags(item.id);
                              }
                            }}
                            className="min-w-0 flex-1 rounded-xl border border-white/[0.06] bg-transparent px-3 py-2 text-xs text-white/70 outline-none transition focus:border-white/20 focus:ring-1 focus:ring-white/10"
                            placeholder="给这张图追加文本标签，逗号分隔"
                          />
                          <button
                            type="button"
                            onClick={() => addItemTextTags(item.id)}
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-white/[0.06] px-3 text-xs font-medium text-white/50 transition hover:border-white/20 hover:text-white/75"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            添加
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })}
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

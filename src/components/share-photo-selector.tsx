"use client";

import { Check, Images, X } from "lucide-react";
import { useMemo, useState } from "react";
import { buildOssImageUrl } from "@/lib/oss/urls";
import {
  deselectVisibleShareImages,
  filterShareSelectionImages,
  selectVisibleShareImages,
  toggleShareSelection
} from "@/lib/shares/selection";

type ShareSelectorTag = {
  id: string;
  name: string;
};

type ShareSelectorImage = {
  id: string;
  objectKey: string;
  filename: string;
  tags: Array<{
    id: string;
    name: string;
    slug: string;
    color?: string | null;
  }>;
};

type SharePhotoSelectorProps = {
  images: ShareSelectorImage[];
  publicBaseUrl: string;
  tags: ShareSelectorTag[];
};

export function SharePhotoSelector({ images, publicBaseUrl, tags }: SharePhotoSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [selectedImageIds, setSelectedImageIds] = useState<string[]>([]);

  const visibleImages = useMemo(
    () => filterShareSelectionImages(images, selectedTagIds),
    [images, selectedTagIds]
  );

  function toggleTagFilter(tagId: string) {
    setSelectedTagIds((currentTagIds) => toggleShareSelection(currentTagIds, tagId));
  }

  function toggleImage(imageId: string) {
    setSelectedImageIds((currentImageIds) => toggleShareSelection(currentImageIds, imageId));
  }

  function selectVisibleImages() {
    setSelectedImageIds((currentImageIds) => selectVisibleShareImages(currentImageIds, visibleImages));
  }

  function deselectVisibleImages() {
    setSelectedImageIds((currentImageIds) => deselectVisibleShareImages(currentImageIds, visibleImages));
  }

  return (
    <div className="space-y-2">
      {selectedImageIds.map((imageId) => (
        <input key={imageId} type="hidden" name="imageIds" value={imageId} />
      ))}
      {selectedTagIds.map((tagId) => (
        <input key={tagId} type="hidden" name="tagIds" value={tagId} />
      ))}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="space-y-0.5">
          <p className="text-[10px] text-white/20">照片选择</p>
          <p className="text-[10px] text-white/15">已选择 {selectedImageIds.length} 张</p>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-md border border-white/[0.06] px-2.5 py-1 text-xs text-white/40 transition hover:border-white/10 hover:text-white/60"
        >
          <Images className="h-3.5 w-3.5" />
          选择照片
        </button>
      </div>

      {isOpen ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4 py-6 backdrop-blur-sm">
          <div className="flex max-h-full w-full max-w-5xl flex-col overflow-hidden rounded-lg border border-white/[0.08] bg-[color:var(--bg-card)] shadow-2xl">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/[0.06] px-4 py-3">
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-white/70">选择分享照片</h3>
                <p className="text-[10px] text-white/25">
                  已选择 {selectedImageIds.length} 张，当前显示 {visibleImages.length} 张
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={selectVisibleImages}
                  className="rounded-md border border-white/[0.06] px-2.5 py-1 text-xs text-white/40 transition hover:border-white/10 hover:text-white/60"
                >
                  全选当前显示
                </button>
                <button
                  type="button"
                  onClick={deselectVisibleImages}
                  className="rounded-md border border-white/[0.06] px-2.5 py-1 text-xs text-white/40 transition hover:border-white/10 hover:text-white/60"
                >
                  取消全选
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-[color:var(--text-muted)] transition hover:bg-white/[0.06] hover:text-[color:var(--text-primary)]"
                  aria-label="关闭"
                >
                  <X className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-md border border-white/[0.06] px-2.5 py-1 text-xs text-white/40 transition hover:border-white/10 hover:text-white/60"
                >
                  保存
                </button>
              </div>
            </div>

            <div className="border-b border-white/[0.04] px-4 py-3">
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => {
                  const selected = selectedTagIds.includes(tag.id);

                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTagFilter(tag.id)}
                      className={[
                        "rounded-full border px-2 py-0.5 text-[10px] transition",
                        selected
                          ? "border-white/15 bg-white/[0.1] text-white/70"
                          : "border-white/[0.06] text-white/30 hover:border-white/10 hover:text-white/50"
                      ].join(" ")}
                    >
                      {tag.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {visibleImages.length ? (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6">
                  {visibleImages.map((image) => {
                    const selected = selectedImageIds.includes(image.id);

                    return (
                      <button
                        key={image.id}
                        type="button"
                        onClick={() => toggleImage(image.id)}
                        className={[
                          "group relative aspect-square overflow-hidden rounded-md border text-left transition",
                          selected
                            ? "border-emerald-400/50 ring-1 ring-emerald-400/35"
                            : "border-white/[0.06] hover:border-white/20"
                        ].join(" ")}
                      >
                        <img
                          src={buildOssImageUrl(image.objectKey, "thumb", { publicBaseUrl })}
                          alt={image.filename}
                          className="h-full w-full object-cover transition group-hover:scale-[1.02]"
                        />
                        <span
                          className={[
                            "absolute left-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded border backdrop-blur",
                            selected
                              ? "border-emerald-300/70 bg-emerald-400/80 text-black"
                              : "border-white/40 bg-black/35 text-transparent"
                          ].join(" ")}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex min-h-48 items-center justify-center text-xs text-white/25">
                  没有符合当前筛选的照片。
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

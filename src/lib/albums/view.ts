export type AlbumsViewMode = "filter" | "timeline";

export type MemoryHighlightKind = "anniversary" | "month" | "tag";

export type AlbumImageTag = {
  id: string;
  name: string;
  slug: string;
  color?: string | null;
};

export type AlbumImageLike = {
  id: string;
  createdAt: Date | string;
  takenAt?: Date | string | null;
  tags: AlbumImageTag[];
};

export type AlbumFilterState = {
  selectedTagIds: string[];
  fromDate?: string;
  toDate?: string;
};

export type TimelineGroup<T extends AlbumImageLike> = {
  dateKey: string;
  label: string;
  images: T[];
};

export type MemoryHighlight<T extends AlbumImageLike> = {
  id: string;
  kind: MemoryHighlightKind;
  title: string;
  description: string;
  shareDescription: string;
  images: T[];
  imageIds: string[];
  previewImages: T[];
  previewImageIds: string[];
};

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

function isValidDateInput(value: string | undefined): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

function getMonthKey(image: AlbumImageLike): string {
  return getAlbumDateKey(image).slice(0, 7);
}

function formatMonthTitle(monthKey: string): string {
  const [year, month] = monthKey.split("-");
  return `${year} 年 ${Number(month)} 月的光影`;
}

function sortImagesByDisplayDateDesc<T extends AlbumImageLike>(images: T[]): T[] {
  return [...images].sort(
    (a, b) => getAlbumDisplayDate(b).getTime() - getAlbumDisplayDate(a).getTime()
  );
}

function createHighlight<T extends AlbumImageLike>(params: {
  id: string;
  kind: MemoryHighlightKind;
  title: string;
  description: string;
  shareDescription: string;
  images: T[];
  previewSeed: string;
}): MemoryHighlight<T> {
  const images = sortImagesByDisplayDateDesc(params.images);
  const previewImages = pickDeterministicSample(images, 10, params.previewSeed);

  return {
    ...params,
    images,
    imageIds: images.map((image) => image.id),
    previewImages,
    previewImageIds: previewImages.map((image) => image.id)
  };
}

function hashString(value: string): number {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function pickDeterministicSample<T extends AlbumImageLike>(
  images: T[],
  limit: number,
  seed: string
): T[] {
  return [...images]
    .sort((imageA, imageB) => {
      const scoreA = hashString(`${seed}:${imageA.id}`);
      const scoreB = hashString(`${seed}:${imageB.id}`);

      if (scoreA !== scoreB) {
        return scoreA - scoreB;
      }

      return imageA.id.localeCompare(imageB.id);
    })
    .slice(0, limit);
}

export function parseAlbumsView(value: string | string[] | undefined): AlbumsViewMode {
  const singleValue = Array.isArray(value) ? value[0] : value;
  return singleValue === "timeline" ? "timeline" : "filter";
}

export function getAlbumDisplayDate(image: AlbumImageLike): Date {
  return image.takenAt ? toDate(image.takenAt) : toDate(image.createdAt);
}

export function getAlbumDateKey(image: AlbumImageLike): string {
  return getAlbumDisplayDate(image).toISOString().slice(0, 10);
}

export function filterAlbumImages<T extends AlbumImageLike>(
  images: T[],
  filters: AlbumFilterState
): T[] {
  const selectedTagIds = Array.from(new Set(filters.selectedTagIds.filter(Boolean)));
  const fromDate = isValidDateInput(filters.fromDate) ? filters.fromDate : "";
  const toDate = isValidDateInput(filters.toDate) ? filters.toDate : "";

  return images.filter((image) => {
    if (
      selectedTagIds.length &&
      !selectedTagIds.every((tagId) => image.tags.some((tag) => tag.id === tagId))
    ) {
      return false;
    }

    const dateKey = getAlbumDateKey(image);

    if (fromDate && dateKey < fromDate) {
      return false;
    }

    if (toDate && dateKey > toDate) {
      return false;
    }

    return true;
  });
}

export function groupImagesByTimelineDate<T extends AlbumImageLike>(
  images: T[]
): TimelineGroup<T>[] {
  const groups = new Map<string, T[]>();
  const sortedImages = [...images].sort(
    (a, b) => getAlbumDisplayDate(b).getTime() - getAlbumDisplayDate(a).getTime()
  );

  for (const image of sortedImages) {
    const dateKey = getAlbumDateKey(image);
    groups.set(dateKey, [...(groups.get(dateKey) ?? []), image]);
  }

  return Array.from(groups.entries()).map(([dateKey, groupImages]) => ({
    dateKey,
    label: dateKey,
    images: groupImages
  }));
}

export function buildMemoryHighlights<T extends AlbumImageLike>(
  images: T[],
  now = new Date()
): MemoryHighlight<T>[] {
  const highlights: MemoryHighlight<T>[] = [];
  const usedHighlightIds = new Set<string>();
  const todayMonthDay = now.toISOString().slice(5, 10);

  const anniversaryImages = images.filter((image) => getAlbumDateKey(image).slice(5, 10) === todayMonthDay);

  if (anniversaryImages.length) {
    highlights.push(
      createHighlight({
        id: `anniversary-${todayMonthDay}`,
        kind: "anniversary",
        title: "今天的往年",
        description: `翻到 ${anniversaryImages.length} 张在这一天留下的照片。`,
        shareDescription: "把这几张照片寄给想念的人。",
        images: anniversaryImages,
        previewSeed: `${now.toISOString().slice(0, 10)}:anniversary:${todayMonthDay}`
      })
    );
    anniversaryImages.forEach((image) => usedHighlightIds.add(image.id));
  }

  const monthGroups = new Map<string, T[]>();

  for (const image of images) {
    const monthKey = getMonthKey(image);
    monthGroups.set(monthKey, [...(monthGroups.get(monthKey) ?? []), image]);
  }

  const monthHighlight = Array.from(monthGroups.entries())
    .filter(([, groupImages]) => groupImages.length >= 3)
    .sort(([monthKeyA, imagesA], [monthKeyB, imagesB]) => {
      if (imagesB.length !== imagesA.length) {
        return imagesB.length - imagesA.length;
      }

      return monthKeyB.localeCompare(monthKeyA);
    })[0];

  if (monthHighlight) {
    const [monthKey, monthImages] = monthHighlight;

    highlights.push(
      createHighlight({
        id: `month-${monthKey}`,
        kind: "month",
        title: formatMonthTitle(monthKey),
        description: `${monthImages.length} 张照片组成了这一段生活切片。`,
        shareDescription: `分享${formatMonthTitle(monthKey)}。`,
        images: monthImages,
        previewSeed: `${now.toISOString().slice(0, 10)}:month:${monthKey}`
      })
    );
    monthImages.forEach((image) => usedHighlightIds.add(image.id));
  }

  const tagGroups = new Map<string, { tag: AlbumImageTag; images: T[] }>();

  for (const image of images) {
    for (const tag of image.tags) {
      const group = tagGroups.get(tag.id);
      tagGroups.set(tag.id, {
        tag,
        images: [...(group?.images ?? []), image]
      });
    }
  }

  const tagHighlight = Array.from(tagGroups.values())
    .filter((group) => group.images.length >= 2)
    .sort((groupA, groupB) => {
      const unusedB = groupB.images.filter((image) => !usedHighlightIds.has(image.id)).length;
      const unusedA = groupA.images.filter((image) => !usedHighlightIds.has(image.id)).length;

      if (unusedB !== unusedA) {
        return unusedB - unusedA;
      }

      if (groupB.images.length !== groupA.images.length) {
        return groupB.images.length - groupA.images.length;
      }

      return groupA.tag.name.localeCompare(groupB.tag.name, "zh-CN");
    })[0];

  if (tagHighlight) {
    highlights.push(
      createHighlight({
        id: `tag-${tagHighlight.tag.id}`,
        kind: "tag",
        title: `${tagHighlight.tag.name}的收藏`,
        description: `${tagHighlight.images.length} 张照片带着同一个心情标签。`,
        shareDescription: `分享${tagHighlight.tag.name}的收藏。`,
        images: tagHighlight.images,
        previewSeed: `${now.toISOString().slice(0, 10)}:tag:${tagHighlight.tag.id}`
      })
    );
  }

  return highlights.slice(0, 3);
}

export function findMemoryHighlightById<T extends AlbumImageLike>(
  images: T[],
  memoryId: string,
  now = new Date()
): MemoryHighlight<T> | null {
  return buildMemoryHighlights(images, now).find((highlight) => highlight.id === memoryId) ?? null;
}

export function buildMemoryShareHref(params: {
  title: string;
  shareDescription: string;
  imageIds: string[];
}): string {
  const searchParams = new URLSearchParams();
  searchParams.set("title", params.title);
  searchParams.set("description", params.shareDescription);

  params.imageIds.forEach((imageId) => searchParams.append("imageId", imageId));

  return `/dashboard/shares?${searchParams.toString()}`;
}

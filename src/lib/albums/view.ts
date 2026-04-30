export type AlbumsViewMode = "filter" | "timeline";

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

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

function isValidDateInput(value: string | undefined): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
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

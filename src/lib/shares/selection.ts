export type ShareSelectionImage = {
  id: string;
  tags: Array<{
    id: string;
  }>;
};

export function filterShareSelectionImages<TImage extends ShareSelectionImage>(
  images: TImage[],
  selectedTagIds: string[]
): TImage[] {
  const uniqueSelectedTagIds = Array.from(new Set(selectedTagIds.filter(Boolean)));

  if (!uniqueSelectedTagIds.length) {
    return images;
  }

  return images.filter((image) => {
    const imageTagIds = new Set(image.tags.map((tag) => tag.id));
    return uniqueSelectedTagIds.every((tagId) => imageTagIds.has(tagId));
  });
}

export function toggleShareSelection(selectedImageIds: string[], imageId: string): string[] {
  if (selectedImageIds.includes(imageId)) {
    return selectedImageIds.filter((selectedImageId) => selectedImageId !== imageId);
  }

  return [...selectedImageIds, imageId];
}

export function selectVisibleShareImages<TImage extends ShareSelectionImage>(
  selectedImageIds: string[],
  visibleImages: TImage[]
): string[] {
  const nextSelectedImageIds = new Set(selectedImageIds);

  visibleImages.forEach((image) => {
    nextSelectedImageIds.add(image.id);
  });

  return Array.from(nextSelectedImageIds);
}

export function deselectVisibleShareImages<TImage extends ShareSelectionImage>(
  selectedImageIds: string[],
  visibleImages: TImage[]
): string[] {
  const visibleImageIds = new Set(visibleImages.map((image) => image.id));

  return selectedImageIds.filter((selectedImageId) => !visibleImageIds.has(selectedImageId));
}

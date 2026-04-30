export const DEFAULT_LIBRARY_COLUMN_COUNT = 4;
export const MIN_LIBRARY_COLUMN_COUNT = 3;
export const MAX_LIBRARY_COLUMN_COUNT = 8;

export function clampLibraryColumnCount(value?: number): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return DEFAULT_LIBRARY_COLUMN_COUNT;
  }

  return Math.min(MAX_LIBRARY_COLUMN_COUNT, Math.max(MIN_LIBRARY_COLUMN_COUNT, Math.round(value)));
}

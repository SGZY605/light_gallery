type ExifLocation = {
  latitude?: number | null;
  longitude?: number | null;
};

type ManualLocation = {
  latitude: number;
  longitude: number;
  label?: string | null;
} | null;

type EditableLocationSeedInput = {
  location: ManualLocation;
  exif: ExifLocation | null | undefined;
};

type DraftLocation = {
  latitude: string;
  longitude: string;
  label: string;
};

type DraftChangesInput = {
  initialTagIds: string[];
  draftTagIds: string[];
  initialLocation: DraftLocation;
  draftLocation: DraftLocation;
};

type BuildDetailSavePayloadInput = {
  draftTagIds: string[];
  draftLocation: DraftLocation;
};

type StructuredMetadataInput = {
  filename: string;
  mimeType: string;
  sizeBytes: number;
  width?: number | null;
  height?: number | null;
  createdAt: string;
  exif?: {
    cameraMake?: string | null;
    cameraModel?: string | null;
    lensModel?: string | null;
    focalLength?: number | null;
    fNumber?: number | null;
    exposureTime?: string | null;
    iso?: number | null;
    takenAt?: string | null;
  } | null;
  location?: {
    latitude: number;
    longitude: number;
    label?: string | null;
  } | null;
};

function formatCoordinate(value: number): string {
  return value.toFixed(6);
}

function normalizeTagIds(tagIds: string[]): string[] {
  return Array.from(new Set(tagIds)).sort((a, b) => a.localeCompare(b));
}

function normalizeDraftLocation(location: DraftLocation): DraftLocation {
  return {
    latitude: location.latitude.trim(),
    longitude: location.longitude.trim(),
    label: location.label.trim()
  };
}

function joinValues(values: Array<string | null | undefined>, separator: string): string {
  return values
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value))
    .join(separator);
}

function formatBytes(sizeBytes: number): string {
  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }

  if (sizeBytes < 1024 * 1024) {
    return `${(sizeBytes / 1024).toFixed(1)} KB`;
  }

  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function formatFocalLength(value: number | null | undefined): string | null {
  return typeof value === "number" ? `${value}mm` : null;
}

function formatAperture(value: number | null | undefined): string | null {
  return typeof value === "number" ? `f/${value}` : null;
}

function formatIso(value: number | null | undefined): string | null {
  return typeof value === "number" ? `ISO ${value}` : null;
}

export function getEditableLocationSeed({ location, exif }: EditableLocationSeedInput) {
  if (location) {
    return {
      latitude: formatCoordinate(location.latitude),
      longitude: formatCoordinate(location.longitude),
      label: location.label?.trim() ?? "",
      source: "manual" as const
    };
  }

  if (typeof exif?.latitude === "number" && typeof exif.longitude === "number") {
    return {
      latitude: formatCoordinate(exif.latitude),
      longitude: formatCoordinate(exif.longitude),
      label: "",
      source: "exif" as const
    };
  }

  return {
    latitude: "",
    longitude: "",
    label: "",
    source: "empty" as const
  };
}

export function hasDetailDraftChanges({
  initialTagIds,
  draftTagIds,
  initialLocation,
  draftLocation
}: DraftChangesInput): boolean {
  const normalizedInitialTags = normalizeTagIds(initialTagIds);
  const normalizedDraftTags = normalizeTagIds(draftTagIds);

  if (normalizedInitialTags.length !== normalizedDraftTags.length) {
    return true;
  }

  if (normalizedInitialTags.some((tagId, index) => tagId !== normalizedDraftTags[index])) {
    return true;
  }

  const normalizedInitialLocation = normalizeDraftLocation(initialLocation);
  const normalizedDraftLocation = normalizeDraftLocation(draftLocation);

  return (
    normalizedInitialLocation.latitude !== normalizedDraftLocation.latitude ||
    normalizedInitialLocation.longitude !== normalizedDraftLocation.longitude ||
    normalizedInitialLocation.label !== normalizedDraftLocation.label
  );
}

export function buildDetailSavePayload({ draftTagIds, draftLocation }: BuildDetailSavePayloadInput) {
  const normalizedLocation = normalizeDraftLocation(draftLocation);
  const tagIds = normalizeTagIds(draftTagIds);

  if (!normalizedLocation.latitude && !normalizedLocation.longitude) {
    return {
      tagIds,
      location: null
    };
  }

  return {
    tagIds,
    location: {
      latitude: Number(normalizedLocation.latitude),
      longitude: Number(normalizedLocation.longitude),
      label: normalizedLocation.label || undefined
    }
  };
}

export function summarizeStructuredMetadata(input: StructuredMetadataInput) {
  const camera = joinValues([input.exif?.cameraMake, input.exif?.cameraModel], " ");
  const lens = input.exif?.lensModel?.trim() ?? "";
  const exposure = joinValues(
    [
      formatFocalLength(input.exif?.focalLength),
      formatAperture(input.exif?.fNumber),
      input.exif?.exposureTime ?? null,
      formatIso(input.exif?.iso)
    ],
    " | "
  );

  return {
    fileSize: formatBytes(input.sizeBytes),
    dimensions: input.width && input.height ? `${input.width} x ${input.height}` : null,
    createdAt: formatDate(input.createdAt),
    takenAt: formatDate(input.exif?.takenAt),
    camera,
    lens,
    exposure
  };
}

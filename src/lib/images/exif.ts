import type { Prisma } from "@prisma/client";

export type NormalizedExif = {
  cameraMake: string | null;
  cameraModel: string | null;
  lensModel: string | null;
  focalLength: number | null;
  fNumber: number | null;
  exposureTime: string | null;
  iso: number | null;
  takenAt: Date | null;
  width: number | null;
  height: number | null;
  orientation: number | null;
  latitude: number | null;
  longitude: number | null;
  raw: Prisma.InputJsonValue;
};

type ExifRecord = Record<string, unknown>;

function asTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
}

function asFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsedValue = Number(value);
    return Number.isFinite(parsedValue) ? parsedValue : null;
  }

  return null;
}

function asInteger(value: unknown): number | null {
  const numberValue = asFiniteNumber(value);
  return numberValue === null ? null : Math.trunc(numberValue);
}

function toExposureTime(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmedValue = value.trim();
    return trimmedValue.length > 0 ? trimmedValue : null;
  }

  const numericValue = asFiniteNumber(value);

  if (numericValue === null || numericValue <= 0) {
    return null;
  }

  if (numericValue >= 1) {
    return Number.isInteger(numericValue) ? String(numericValue) : numericValue.toFixed(1);
  }

  const denominator = Math.round(1 / numericValue);
  return denominator > 0 ? `1/${denominator}` : null;
}

function toDateValue(value: unknown): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "string" || typeof value === "number") {
    const parsedDate = new Date(value);
    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
  }

  return null;
}

function toLatitude(value: unknown): number | null {
  const latitude = asFiniteNumber(value);
  return latitude !== null && latitude >= -90 && latitude <= 90 ? latitude : null;
}

function toLongitude(value: unknown): number | null {
  const longitude = asFiniteNumber(value);
  return longitude !== null && longitude >= -180 && longitude <= 180 ? longitude : null;
}

function toJsonEntry(value: unknown): Prisma.InputJsonValue | null {
  if (value === null) {
    return null;
  }

  if (
    typeof value === "string" ||
    typeof value === "boolean" ||
    (typeof value === "number" && Number.isFinite(value))
  ) {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map((entry) => toJsonEntry(entry));
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).flatMap(([key, entry]) =>
      entry === undefined ? [] : [[key, toJsonEntry(entry)]]
    );

    return Object.fromEntries(entries) as Prisma.InputJsonObject;
  }

  return String(value);
}

function toJsonObject(value: ExifRecord): Prisma.InputJsonObject {
  return Object.fromEntries(
    Object.entries(value).flatMap(([key, entry]) => (entry === undefined ? [] : [[key, toJsonEntry(entry)]]))
  ) as Prisma.InputJsonObject;
}

export function normalizeExif(input: unknown): NormalizedExif | null {
  if (!input || typeof input !== "object") {
    return null;
  }

  const exif = input as ExifRecord;

  return {
    cameraMake: asTrimmedString(exif.Make ?? exif.cameraMake),
    cameraModel: asTrimmedString(exif.Model ?? exif.cameraModel),
    lensModel: asTrimmedString(exif.LensModel ?? exif.lensModel),
    focalLength: asFiniteNumber(exif.FocalLength ?? exif.focalLength),
    fNumber: asFiniteNumber(exif.FNumber ?? exif.fNumber),
    exposureTime: toExposureTime(exif.ExposureTime ?? exif.exposureTime),
    iso: asInteger(exif.ISO ?? exif.iso),
    takenAt: toDateValue(
      exif.DateTimeOriginal ?? exif.CreateDate ?? exif.DateTimeDigitized ?? exif.takenAt
    ),
    width: asInteger(exif.ExifImageWidth ?? exif.ImageWidth ?? exif.width),
    height: asInteger(exif.ExifImageHeight ?? exif.ImageHeight ?? exif.height),
    orientation: asInteger(exif.Orientation ?? exif.orientation),
    latitude: toLatitude(exif.latitude ?? exif.GPSLatitude),
    longitude: toLongitude(exif.longitude ?? exif.GPSLongitude),
    raw: toJsonObject(exif)
  };
}

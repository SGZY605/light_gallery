type ExifSummaryProps = {
  exif?: {
    cameraMake?: string | null;
    cameraModel?: string | null;
    lensModel?: string | null;
    focalLength?: number | null;
    fNumber?: number | null;
    exposureTime?: string | null;
    iso?: number | null;
    takenAt?: Date | string | null;
  } | null;
  className?: string;
};

function formatDate(value: Date | string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function joinValues(values: Array<string | null | undefined>, separator: string): string | null {
  const filteredValues = values.map((value) => value?.trim()).filter(Boolean);
  return filteredValues.length ? filteredValues.join(separator) : null;
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

export function ExifSummary({ exif, className }: ExifSummaryProps) {
  if (!exif) {
    return null;
  }

  const camera = joinValues([exif.cameraMake, exif.cameraModel], " ");
  const exposure = joinValues(
    [
      formatFocalLength(exif.focalLength),
      formatAperture(exif.fNumber),
      exif.exposureTime ?? null,
      formatIso(exif.iso)
    ],
    " • "
  );
  const takenAt = formatDate(exif.takenAt);
  const lines = [camera, exif.lensModel ?? null, exposure, takenAt].filter(Boolean) as string[];

  if (!lines.length) {
    return null;
  }

  return (
    <div className={className}>
      {lines.map((line) => (
        <p key={line}>{line}</p>
      ))}
    </div>
  );
}

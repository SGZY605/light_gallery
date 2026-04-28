export type EffectiveLocation = {
  latitude: number;
  longitude: number;
  label?: string | null;
  source: "manual" | "exif";
};

type ResolveEffectiveLocationInput = {
  exif?: {
    latitude?: number | null;
    longitude?: number | null;
  } | null;
  override?: {
    latitude: number;
    longitude: number;
    label?: string | null;
  } | null;
};

function isValidLatitude(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= -90 && value <= 90;
}

function isValidLongitude(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= -180 && value <= 180;
}

export function resolveEffectiveLocation({
  exif,
  override
}: ResolveEffectiveLocationInput): EffectiveLocation | null {
  if (override && isValidLatitude(override.latitude) && isValidLongitude(override.longitude)) {
    return {
      latitude: override.latitude,
      longitude: override.longitude,
      label: override.label ?? null,
      source: "manual"
    };
  }

  if (exif && isValidLatitude(exif.latitude) && isValidLongitude(exif.longitude)) {
    return {
      latitude: exif.latitude,
      longitude: exif.longitude,
      source: "exif"
    };
  }

  return null;
}

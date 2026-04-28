import { describe, expect, it } from "vitest";
import { resolveEffectiveLocation } from "@/lib/images/location";

describe("resolveEffectiveLocation", () => {
  it("prefers manual override over exif gps", () => {
    const result = resolveEffectiveLocation({
      exif: { latitude: 31.2, longitude: 121.4 },
      override: { latitude: 35.6, longitude: 139.7, label: "Tokyo" }
    });

    expect(result).toEqual({ latitude: 35.6, longitude: 139.7, label: "Tokyo", source: "manual" });
  });

  it("uses exif gps when no override exists", () => {
    const result = resolveEffectiveLocation({
      exif: { latitude: 31.2, longitude: 121.4 },
      override: null
    });

    expect(result?.source).toBe("exif");
  });
});

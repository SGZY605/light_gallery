import { describe, expect, it } from "vitest";
import { normalizeExif } from "@/lib/images/exif";

describe("normalizeExif", () => {
  it("keeps common camera fields and numeric GPS values", () => {
    const result = normalizeExif({
      Make: "FUJIFILM",
      Model: "X100V",
      LensModel: "23mmF2",
      FNumber: 2,
      ExposureTime: 0.004,
      ISO: 400,
      latitude: 31.2304,
      longitude: 121.4737
    });

    expect(result?.cameraMake).toBe("FUJIFILM");
    expect(result?.cameraModel).toBe("X100V");
    expect(result?.fNumber).toBe(2);
    expect(result?.latitude).toBe(31.2304);
    expect(result?.exposureTime).toBe("1/250");
  });

  it("drops invalid GPS values and keeps raw metadata serializable", () => {
    const result = normalizeExif({
      latitude: 120,
      longitude: 240,
      DateTimeOriginal: new Date("2024-05-01T10:00:00.000Z")
    });

    expect(result?.latitude).toBeNull();
    expect(result?.longitude).toBeNull();
    expect(result?.raw).toEqual({
      latitude: 120,
      longitude: 240,
      DateTimeOriginal: "2024-05-01T10:00:00.000Z"
    });
  });
});

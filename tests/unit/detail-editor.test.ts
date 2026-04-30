import { describe, expect, it } from "vitest";
import {
  buildDetailSavePayload,
  getEditableLocationSeed,
  hasDetailDraftChanges,
  summarizeStructuredMetadata,
  validateDetailDraftLocation
} from "@/lib/images/detail-editor";

describe("detail editor helpers", () => {
  it("prefers manual location for editable seed and falls back to exif gps", () => {
    expect(
      getEditableLocationSeed({
        location: { latitude: 35.6, longitude: 139.7, label: "Tokyo" },
        exif: { latitude: 31.2, longitude: 121.4 }
      })
    ).toEqual({
      latitude: "35.600000",
      longitude: "139.700000",
      label: "Tokyo",
      source: "manual"
    });
  });

  it("uses exif gps when no manual location exists", () => {
    expect(
      getEditableLocationSeed({
        location: null,
        exif: { latitude: 31.2304, longitude: 121.4737 }
      })
    ).toEqual({
      latitude: "31.230400",
      longitude: "121.473700",
      label: "",
      source: "exif"
    });
  });

  it("detects dirty draft when tags change", () => {
    expect(
      hasDetailDraftChanges({
        initialTagIds: ["tag-1"],
        draftTagIds: ["tag-1", "tag-2"],
        initialLocation: { latitude: "31.230400", longitude: "121.473700", label: "" },
        draftLocation: { latitude: "31.230400", longitude: "121.473700", label: "" }
      })
    ).toBe(true);
  });

  it("detects dirty draft when coordinates change", () => {
    expect(
      hasDetailDraftChanges({
        initialTagIds: ["tag-1"],
        draftTagIds: ["tag-1"],
        initialLocation: { latitude: "31.230400", longitude: "121.473700", label: "" },
        draftLocation: { latitude: "35.600000", longitude: "139.700000", label: "" }
      })
    ).toBe(true);
  });

  it("builds null location payload when manual override is cleared", () => {
    expect(
      buildDetailSavePayload({
        draftTagIds: ["tag-1"],
        draftLocation: { latitude: "", longitude: "", label: "" }
      })
    ).toEqual({
      tagIds: ["tag-1"],
      location: null
    });
  });

  it("builds a sorted deduplicated payload and trims label", () => {
    expect(
      buildDetailSavePayload({
        draftTagIds: ["tag-2", "tag-1", "tag-1"],
        draftLocation: {
          latitude: "35.600000",
          longitude: "139.700000",
          label: " Tokyo "
        }
      })
    ).toEqual({
      tagIds: ["tag-1", "tag-2"],
      location: { latitude: 35.6, longitude: 139.7, label: "Tokyo" }
    });
  });

  it("stores empty location label as undefined when coordinates exist", () => {
    expect(
      buildDetailSavePayload({
        draftTagIds: ["tag-1"],
        draftLocation: {
          latitude: "35.600000",
          longitude: "139.700000",
          label: "   "
        }
      })
    ).toEqual({
      tagIds: ["tag-1"],
      location: { latitude: 35.6, longitude: 139.7, label: undefined }
    });
  });

  it("accepts empty coordinates as clearing manual location", () => {
    expect(
      validateDetailDraftLocation({
        latitude: "",
        longitude: "",
        label: ""
      })
    ).toEqual({
      ok: true,
      value: null
    });
  });

  it("rejects invalid coordinate ranges", () => {
    expect(
      validateDetailDraftLocation({
        latitude: "91",
        longitude: "181",
        label: ""
      })
    ).toEqual({
      ok: false,
      errors: {
        latitude: "纬度必须在 -90 到 90 之间",
        longitude: "经度必须在 -180 到 180 之间"
      }
    });
  });

  it("rejects partial coordinates instead of coercing empty text to zero", () => {
    expect(
      validateDetailDraftLocation({
        latitude: "",
        longitude: "121.4737",
        label: ""
      })
    ).toEqual({
      ok: false,
      errors: {
        latitude: "纬度不能为空",
        longitude: undefined
      }
    });
  });

  it("summarizes structured metadata for the sidebar", () => {
    expect(
      summarizeStructuredMetadata({
        filename: "demo.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 1048576,
        width: 6000,
        height: 4000,
        createdAt: "2026-04-30T08:00:00.000Z",
        exif: {
          cameraMake: "FUJIFILM",
          cameraModel: "X100V",
          lensModel: "23mmF2",
          focalLength: 23,
          fNumber: 2,
          exposureTime: "1/250",
          iso: 400,
          takenAt: "2026-04-01T10:00:00.000Z"
        },
        location: null
      }).camera
    ).toContain("FUJIFILM");
  });
});

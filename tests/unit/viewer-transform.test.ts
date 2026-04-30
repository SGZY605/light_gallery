import { describe, expect, it } from "vitest";
import {
  clampViewerOffset,
  createWheelZoomTransform,
  getViewerCursorState
} from "@/lib/images/viewer-transform";

describe("viewer transform helpers", () => {
  it("zooms around the cursor point", () => {
    expect(
      createWheelZoomTransform({
        current: { x: 0, y: 0, scale: 1 },
        nextScale: 2,
        pointer: { x: 200, y: 100 },
        viewport: { width: 800, height: 600 }
      })
    ).toEqual({ x: 200, y: 200, scale: 2 });
  });

  it("clamps offsets so the image cannot be dragged fully outside the stage", () => {
    expect(
      clampViewerOffset({
        x: 2000,
        y: -2000,
        scale: 3,
        image: { width: 1200, height: 800 },
        viewport: { width: 800, height: 600 }
      })
    ).toEqual({
      x: 1400,
      y: -900
    });
  });

  it("returns grab cursor only when panning is possible", () => {
    expect(getViewerCursorState({ scale: 1, imageFitsViewport: true, isDragging: false })).toBe("default");
    expect(getViewerCursorState({ scale: 2, imageFitsViewport: false, isDragging: false })).toBe("grab");
    expect(getViewerCursorState({ scale: 2, imageFitsViewport: false, isDragging: true })).toBe("grabbing");
  });
});

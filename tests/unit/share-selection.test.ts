import { describe, expect, it } from "vitest";
import {
  filterShareSelectionImages,
  deselectVisibleShareImages,
  getSelectedShareImages,
  selectVisibleShareImages,
  toggleShareSelection
} from "@/lib/shares/selection";

const images = [
  {
    id: "image-1",
    tags: [{ id: "tag-family" }, { id: "tag-travel" }]
  },
  {
    id: "image-2",
    tags: [{ id: "tag-family" }]
  },
  {
    id: "image-3",
    tags: [{ id: "tag-work" }]
  },
  {
    id: "image-4",
    tags: []
  }
];

describe("share selection helpers", () => {
  it("shows every image when no tag filter is selected", () => {
    expect(filterShareSelectionImages(images, []).map((image) => image.id)).toEqual([
      "image-1",
      "image-2",
      "image-3",
      "image-4"
    ]);
  });

  it("filters visible images by every selected tag", () => {
    expect(filterShareSelectionImages(images, ["tag-family", "tag-travel"]).map((image) => image.id)).toEqual([
      "image-1"
    ]);
  });

  it("selects only currently visible images without losing previous selections", () => {
    const visibleImages = filterShareSelectionImages(images, ["tag-family"]);

    expect(selectVisibleShareImages(["image-3"], visibleImages)).toEqual(["image-3", "image-1", "image-2"]);
  });

  it("toggles one selected image without changing the rest", () => {
    expect(toggleShareSelection(["image-1", "image-2"], "image-1")).toEqual(["image-2"]);
    expect(toggleShareSelection(["image-2"], "image-3")).toEqual(["image-2", "image-3"]);
  });

  it("deselects only currently visible images without touching hidden selections", () => {
    const visibleImages = filterShareSelectionImages(images, ["tag-family"]);

    expect(deselectVisibleShareImages(["image-1", "image-2", "image-3"], visibleImages)).toEqual(["image-3"]);
  });

  it("returns selected images in the current selection order for the outside preview strip", () => {
    expect(getSelectedShareImages(images, ["image-3", "image-1", "missing"])).toEqual([
      images[2],
      images[0]
    ]);
  });
});

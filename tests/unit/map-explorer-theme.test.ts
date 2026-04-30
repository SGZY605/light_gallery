import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = process.cwd();

function readProjectFile(path: string): string {
  return readFileSync(join(projectRoot, path), "utf8");
}

describe("map explorer theme styling", () => {
  it("uses dashboard theme tokens instead of fixed slate colors for cards and text", () => {
    const content = readProjectFile("src/components/map-explorer.tsx");
    const fixedCardClasses = [
      "bg-slate-50",
      "bg-slate-200",
      "border-slate-200",
      "border-slate-300",
      "text-slate-950",
      "text-slate-600",
      "text-slate-500",
      "text-slate-400"
    ];

    for (const className of fixedCardClasses) {
      expect(content).not.toMatch(new RegExp(`(^|\\s)${className}(\\s|")`));
    }
  });

  it("does not render the old tag and date filter controls", () => {
    const content = readProjectFile("src/components/map-explorer.tsx");

    expect(content).not.toContain("标签筛选");
    expect(content).not.toContain("起始日期");
    expect(content).not.toContain("截止日期");
    expect(content).not.toContain("selectedTagId");
    expect(content).not.toContain("fromDate");
    expect(content).not.toContain("toDate");
  });

  it("uses per-image thumbnail markers instead of count-circle markers", () => {
    const canvas = readProjectFile("src/components/map-canvas.tsx");
    const explorer = readProjectFile("src/components/map-explorer.tsx");

    expect(canvas).toContain("thumbnailUrl");
    expect(canvas).toContain("createThumbnailIcon");
    expect(canvas).not.toContain("createMarkerIcon(count");
    expect(explorer).toContain("selectedImage");
    expect(explorer).toContain("image-detail-return-url");
  });
});

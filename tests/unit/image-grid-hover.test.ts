import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = process.cwd();

function readProjectFile(path: string): string {
  return readFileSync(join(projectRoot, path), "utf8");
}

describe("image grid hover treatment", () => {
  it("keeps the tile frame stable while zooming the internal image and revealing metadata", () => {
    const source = readProjectFile("src/components/image-grid.tsx");
    const styles = readProjectFile("src/app/globals.css");

    expect(source).toContain("group/image-tile");
    expect(source).toContain("overflow-hidden");
    expect(source).toContain("group-hover/image-tile:scale");
    expect(source).toContain("bg-gradient-to-t");
    expect(source).toContain("formatImageDimensions");
    expect(source).toContain("{image.filename}");
    expect(source).toContain("gallery-hover-overlay-title");
    expect(source).toContain("gallery-hover-overlay-meta");
    expect(source).not.toContain("text-white/90");
    expect(source).not.toContain("text-white/65");
    expect(styles).toContain(".gallery-hover-overlay-title");
    expect(styles).toContain("color: rgba(255, 255, 255, 0.96) !important");
  });

  it("uses the same soft staggered entry motion as album thumbnails", () => {
    const source = readProjectFile("src/components/image-grid.tsx");
    const styles = readProjectFile("src/app/globals.css");

    expect(source).toContain("gallery-entry-tile");
    expect(source).toContain("--entry-index");
    expect(source).toContain("index");
    expect(source).toContain("group-hover/image-tile:scale");
    expect(styles).toContain(".gallery-entry-tile");
    expect(styles).toContain("animation: album-soft-entry 520ms cubic-bezier(0.22, 1, 0.36, 1) both");
    expect(styles).toContain("animation-delay: min(calc(var(--entry-index, 0) * 46ms), 360ms)");
    expect(styles).not.toContain("@keyframes gallery-waterfall-entry");
    expect(styles).toContain("@media (prefers-reduced-motion: reduce)");
    expect(styles).toContain(".gallery-entry-tile");
    expect(styles).toContain("animation: none");
  });
});

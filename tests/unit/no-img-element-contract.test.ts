import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = process.cwd();

function readProjectFile(path: string): string {
  return readFileSync(join(projectRoot, path), "utf8");
}

describe("image rendering lint contracts", () => {
  it("uses next/image instead of raw img tags in gallery-facing components", () => {
    const componentPaths = [
      "src/components/album-photo-tile.tsx",
      "src/components/image-detail-view.tsx",
      "src/components/image-grid.tsx",
      "src/components/map-explorer.tsx",
      "src/components/share-gallery.tsx",
      "src/components/share-photo-selector.tsx",
      "src/components/upload-dropzone.tsx"
    ];

    for (const componentPath of componentPaths) {
      const source = readProjectFile(componentPath);

      expect(source, componentPath).not.toContain("<img");
    }
  });
});

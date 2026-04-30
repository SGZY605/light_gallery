import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = process.cwd();

function readProjectFile(path: string): string {
  return readFileSync(join(projectRoot, path), "utf8");
}

describe("image detail sidebar layout", () => {
  it("keeps the tag dropdown above the Leaflet mini map panes", () => {
    const sidebarContent = readProjectFile("src/components/image-detail-sidebar.tsx");
    const miniMapContent = readProjectFile("src/components/mini-map-internal.tsx");

    expect(sidebarContent).toContain('className="relative z-10"');
    expect(sidebarContent).toContain('className="absolute left-0 top-full z-20');
    expect(miniMapContent).toContain('className="relative z-0 w-full overflow-hidden');
  });

  it("renders a dedicated download action next to save changes", () => {
    const sidebarContent = readProjectFile("src/components/image-detail-sidebar.tsx");
    const detailViewContent = readProjectFile("src/components/image-detail-view.tsx");

    expect(sidebarContent).toContain("downloadUrl");
    expect(sidebarContent).toContain("download={filename}");
    expect(detailViewContent).toContain("buildOssImageUrl(image.objectKey, \"original\"");
  });
});

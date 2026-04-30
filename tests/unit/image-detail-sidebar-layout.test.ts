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

  it("keeps deletion in the top-right toolbar behind a second and final destructive confirmation", () => {
    const detailViewContent = readProjectFile("src/components/image-detail-view.tsx");
    const deleteButtonIndex = detailViewContent.indexOf('aria-label="删除图片"');
    const zoomToolbarIndex = detailViewContent.indexOf("Math.round(transform.scale * 100)");
    const deleteDialogIndex = detailViewContent.indexOf("showDeleteDialog");
    const finalDeleteDialogIndex = detailViewContent.indexOf("showFinalDeleteDialog");

    expect(deleteButtonIndex).toBeGreaterThan(zoomToolbarIndex);
    expect(finalDeleteDialogIndex).toBeGreaterThan(deleteDialogIndex);
    expect(detailViewContent).toContain("setShowFinalDeleteDialog(true)");
    expect(detailViewContent).toContain("setShowDeleteDialog(false)");
    expect(detailViewContent).toContain("这一步会删除 OSS 中的原图/预览图，并删除本机数据库记录。请慎重操作！");
    expect(detailViewContent).toContain("deleteConfirmationName === image.filename");
    expect(detailViewContent).toContain('placeholder="输入图片名以确认删除"');
    expect(detailViewContent).toMatch(/showFinalDeleteDialog[\s\S]*onClick=\{\(\) => void confirmDelete\(\)\}/);
    expect(detailViewContent).toMatch(/showFinalDeleteDialog[\s\S]*disabled=\{isDeleting \|\| !canConfirmImageDelete\}/);
  });
});

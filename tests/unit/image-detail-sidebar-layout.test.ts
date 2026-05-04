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
    expect(detailViewContent).toContain('buildOssImageUrl(image.objectKey, "original"');
  });

  it("shows the detail image without an extra framed shadow treatment", () => {
    const detailViewContent = readProjectFile("src/components/image-detail-view.tsx");
    const mainImageClass = detailViewContent.match(/className="block max-h-\[82vh\][^"]*"/)?.[0];

    expect(mainImageClass).toBeTruthy();
    expect(mainImageClass).not.toContain("shadow-2xl");
    expect(mainImageClass).not.toContain("rounded-lg");
  });

  it("restores the dashboard scroll container after closing image details", () => {
    const layoutContent = readProjectFile("src/app/dashboard/layout.tsx");
    const detailViewContent = readProjectFile("src/components/image-detail-view.tsx");

    expect(layoutContent).toContain("ImageDetailScrollRestorer");
    expect(layoutContent).toContain("data-dashboard-content");
    expect(detailViewContent).toContain("IMAGE_DETAIL_RETURN_URL_KEY");
    expect(detailViewContent).toContain("router.replace(returnUrlRef.current || DEFAULT_RETURN_URL, { scroll: false })");
  });

  it("has a single delete dialog with filename input for confirmation", () => {
    const detailViewContent = readProjectFile("src/components/image-detail-view.tsx");

    // Should have delete dialog but no final delete dialog
    expect(detailViewContent).toContain("showDeleteDialog");
    expect(detailViewContent).not.toContain("showFinalDeleteDialog");

    // Delete dialog should contain filename input
    expect(detailViewContent).toContain('placeholder="输入图片名以确认删除"');
    expect(detailViewContent).toContain("deleteConfirmationName === image.filename");

    // Delete button should directly call confirmDelete
    expect(detailViewContent).toMatch(/showDeleteDialog[\s\S]*onClick=\{\(\) => void confirmDelete\(\)\}/);
    expect(detailViewContent).toMatch(/showDeleteDialog[\s\S]*disabled=\{isDeleting \|\| !canConfirmImageDelete\}/);

    // Should have delete warning text
    expect(detailViewContent).toContain("这会同时删除本地记录和 OSS 中的对应图片");

    // Should support Enter key to confirm
    expect(detailViewContent).toContain('event.key === "Enter" && canConfirmImageDelete');
  });

  it("adds a favorite heart before the destructive delete action", () => {
    const detailPageContent = readProjectFile("src/app/dashboard/library/[id]/page.tsx");
    const detailViewContent = readProjectFile("src/components/image-detail-view.tsx");
    const routeContent = readProjectFile("src/app/api/images/[id]/favorite/route.ts");
    const favoriteIndex = detailViewContent.indexOf('aria-label={isFavorite ? "取消收藏" : "收藏图片"}');
    const deleteIndex = detailViewContent.indexOf('aria-label="删除图片"');

    expect(detailPageContent).toContain("featured: visibleImage.featured");
    expect(detailViewContent).toContain("Heart");
    expect(detailViewContent).toContain("isFavorite");
    expect(detailViewContent).toContain("toggleFavorite");
    expect(favoriteIndex).toBeGreaterThan(-1);
    expect(favoriteIndex).toBeLessThan(deleteIndex);
    expect(routeContent).toContain("featured");
    expect(routeContent).toContain("db.image.update");
  });
});

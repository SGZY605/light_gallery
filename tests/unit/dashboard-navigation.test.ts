import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = process.cwd();

function readProjectFile(path: string): string {
  return readFileSync(join(projectRoot, path), "utf8");
}

function expectPublicBrandAsset(filename: string) {
  expect(existsSync(join(projectRoot, "public", "brand", filename)), filename).toBe(true);
}

function extractNavigationLabels(source: string): string[] {
  return Array.from(source.matchAll(/label:\s*"([^"]+)"/g)).map((match) => match[1]);
}

describe("dashboard navigation", () => {
  it("renders the requested sidebar order without home", () => {
    const source = readProjectFile("src/components/dashboard-nav.tsx");

    expect(extractNavigationLabels(source)).toEqual([
      "图库",
      "相册",
      "地图",
      "标签",
      "上传",
      "分享",
      "用户",
      "设置"
    ]);
    expect(source).not.toContain("首页");
    expect(source).toContain('href: "/dashboard/albums"');
    expect(source).toContain("requiresManager: true");
  });

  it("uses a wider expanded rail, larger centered nav items, and single logo image", () => {
    const navSource = readProjectFile("src/components/dashboard-nav.tsx");
    const layoutSource = readProjectFile("src/app/dashboard/layout.tsx");

    expect(layoutSource).toContain("xl:w-40");
    expect(layoutSource).toContain("/brand/gallery_logo.png");
    expect(layoutSource).toContain("光影画廊");
    expect(layoutSource).not.toContain("/brand/gallery_light.png");
    expect(layoutSource).not.toContain("/brand/gallery_dark.png");
    expect(layoutSource).not.toContain("dashboard-brand-mark");
    expect(layoutSource).not.toContain("dashboard-brand-image");
    expect(layoutSource).toContain('alt="光影画廊"');
    expect(layoutSource).toContain("width={48}");
    expect(layoutSource).toContain("height={48}");
    expect(layoutSource).toContain("h-12 w-12");
    expect(layoutSource).toContain("text-sm font-semibold");
    expect(layoutSource).toContain("flex flex-col items-center gap-2");
    expect(layoutSource).toContain("已登录为");
    expect(layoutSource).toContain("退出登录");
    expect(navSource).toContain("space-y-1.5");
    expect(navSource).toContain("h-4 w-4");
    expectPublicBrandAsset("gallery_logo.png");
  });

  it("declares the browser logo and keeps public images in the Docker runtime image", () => {
    const rootLayoutSource = readProjectFile("src/app/layout.tsx");
    const packageJson = readProjectFile("package.json");
    const syncScript = readProjectFile("scripts/sync-brand-assets.mjs");
    const dockerfile = readProjectFile("Dockerfile");

    expect(rootLayoutSource).toContain("icons:");
    expect(rootLayoutSource).toContain("/brand/gallery_logo.png");
    expect(packageJson).toContain("\"prebuild\": \"node scripts/sync-brand-assets.mjs\"");
    expect(syncScript).toContain("assets");
    expect(syncScript).toContain("public");
    expect(syncScript).toContain("gallery_light.png");
    expect(syncScript).toContain("gallery_dark.png");
    expect(syncScript).toContain("gallery_logo.png");
    expect(dockerfile).toContain("COPY --from=builder /app/public ./public");
    expectPublicBrandAsset("gallery_logo.png");
  });

  it("redirects the dashboard root to the gallery", () => {
    const source = readProjectFile("src/app/dashboard/page.tsx");

    expect(source).toContain('redirect("/dashboard/library")');
    expect(source).not.toContain("db.image.count");
    expect(source).not.toContain("DashboardOverviewPage");
  });
});

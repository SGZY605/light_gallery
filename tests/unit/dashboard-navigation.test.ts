import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = process.cwd();

function readProjectFile(path: string): string {
  return readFileSync(join(projectRoot, path), "utf8");
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

  it("redirects the dashboard root to the gallery", () => {
    const source = readProjectFile("src/app/dashboard/page.tsx");

    expect(source).toContain('redirect("/dashboard/library")');
    expect(source).not.toContain("db.image.count");
    expect(source).not.toContain("DashboardOverviewPage");
  });
});

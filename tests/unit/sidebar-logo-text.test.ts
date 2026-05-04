import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = process.cwd();

function readProjectFile(path: string): string {
  return readFileSync(join(projectRoot, path), "utf8");
}

describe("dashboard sidebar - logo and text", () => {
  it("uses gallery_logo.png instead of light/dark images", () => {
    const source = readProjectFile("src/app/dashboard/layout.tsx");
    expect(source).toContain("/brand/gallery_logo.png");
    expect(source).not.toContain("/brand/gallery_light.png");
    expect(source).not.toContain("/brand/gallery_dark.png");
  });

  it("displays 光影画廊 text below logo", () => {
    const source = readProjectFile("src/app/dashboard/layout.tsx");
    expect(source).toContain("光影画廊");
  });

  it("uses smaller image size (48x48)", () => {
    const source = readProjectFile("src/app/dashboard/layout.tsx");
    expect(source).toContain("width={48}");
    expect(source).toContain("height={48}");
    expect(source).toContain("h-12 w-12");
  });

  it("removes dashboard-brand-mark and theme-specific classes", () => {
    const source = readProjectFile("src/app/dashboard/layout.tsx");
    expect(source).not.toContain("dashboard-brand-mark");
    expect(source).not.toContain("dashboard-brand-image");
    expect(source).not.toContain("dashboard-brand-image-light");
    expect(source).not.toContain("dashboard-brand-image-dark");
  });

  it("has alt text for accessibility", () => {
    const source = readProjectFile("src/app/dashboard/layout.tsx");
    expect(source).toContain('alt="光影画廊"');
  });

  it("uses flex column layout for logo and text", () => {
    const source = readProjectFile("src/app/dashboard/layout.tsx");
    expect(source).toContain("flex flex-col items-center gap-2");
  });

  it("styles text with proper font weight and size", () => {
    const source = readProjectFile("src/app/dashboard/layout.tsx");
    expect(source).toContain("text-sm font-semibold");
  });

  it("gallery_logo.png exists in public/brand", () => {
    expect(existsSync(join(projectRoot, "public", "brand", "gallery_logo.png"))).toBe(true);
  });
});

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = process.cwd();

function readProjectFile(path: string): string {
  return readFileSync(join(projectRoot, path), "utf8");
}

describe("tag image count logic", () => {
  it("queries tags with manual image count instead of _count.images", () => {
    const content = readProjectFile("src/app/dashboard/tags/page.tsx");
    
    // Should not use _count for images
    expect(content).not.toContain("images: true");
    
    // Should use manual count query
    expect(content).toContain("db.imageTag.count");
    expect(content).toContain("deletedAt: null");
  });

  it("counts only active images (deletedAt IS NULL)", () => {
    const content = readProjectFile("src/app/dashboard/tags/page.tsx");
    
    // Should query imageTag with image.deletedAt condition
    expect(content).toContain("where: {");
    expect(content).toContain("tagId: tag.id");
    expect(content).toContain("image: {");
    expect(content).toContain("deletedAt: null");
  });

  it("uses tagsWithImageCount for rendering", () => {
    const content = readProjectFile("src/app/dashboard/tags/page.tsx");
    
    // Should use tagsWithImageCount
    expect(content).toContain("tagsWithImageCount");
    expect(content).toContain("tagsWithImageCount.map");
    
    // Should use tag.imageCount instead of tag._count.images
    expect(content).toContain("tag.imageCount");
    expect(content).not.toContain("tag._count.images");
  });

  it("preserves share count query", () => {
    const content = readProjectFile("src/app/dashboard/tags/page.tsx");
    
    // Should still count shares
    expect(content).toContain("shares: true");
    expect(content).toContain("tag._count.shares");
  });

  it("handles tags with zero images correctly", () => {
    const content = readProjectFile("src/app/dashboard/tags/page.tsx");
    
    // Should handle zero count
    expect(content).toContain("imageCount={tag.imageCount}");
    expect(content).toContain("shareCount={tag._count.shares}");
  });

  it("preserves tag operations (create, rename, delete, merge)", () => {
    const content = readProjectFile("src/app/dashboard/tags/page.tsx");
    
    // Should have all tag operations
    expect(content).toContain("createTagAction");
    expect(content).toContain("renameTagAction");
    expect(content).toContain("deleteTagAction");
    expect(content).toContain("mergeTagsAction");
  });

  it("excludes soft-deleted images from count", () => {
    const content = readProjectFile("src/app/dashboard/tags/page.tsx");
    
    // The key requirement: only count images where deletedAt is null
    // This ensures soft-deleted images don't affect tag counts
    const countQueryRegex = /db\.imageTag\.count\(\{[\s\S]*?deletedAt:\s*null[\s\S]*?\}\)/;
    expect(content).toMatch(countQueryRegex);
  });

  it("uses Promise.all for parallel count queries", () => {
    const content = readProjectFile("src/app/dashboard/tags/page.tsx");
    
    // Should use Promise.all for efficiency
    expect(content).toContain("Promise.all");
    expect(content).toContain("tags.map(async (tag)");
  });
});

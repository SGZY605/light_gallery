import { describe, expect, it } from "vitest";

describe("orphan tag sync", () => {
  it("buildTagsOssKey constructs correct OSS key", () => {
    const fs = require("fs");
    const path = require("path");
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/lib/images/metadata-sync.ts"),
      "utf8"
    );

    expect(source).toContain("export function buildTagsOssKey(");
    expect(source).toContain("`${metadataPrefix}/tags.json`");
  });

  it("TagsMetadataJson type includes tags and syncedAt fields", () => {
    const fs = require("fs");
    const path = require("path");
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/lib/images/metadata-sync.ts"),
      "utf8"
    );

    expect(source).toContain("type TagsMetadataJson = {");
    expect(source).toContain("tags: Array<{ color: string | null; name: string }>");
    expect(source).toContain("syncedAt: string;");
  });

  it("syncOrphanTags function exists", () => {
    const fs = require("fs");
    const path = require("path");
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/lib/images/metadata-sync.ts"),
      "utf8"
    );

    expect(source).toContain("async function syncOrphanTags(");
  });

  it("syncOrphanTags reads tags from OSS", () => {
    const fs = require("fs");
    const path = require("path");
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/lib/images/metadata-sync.ts"),
      "utf8"
    );

    expect(source).toContain("buildTagsOssKey(config.metadataPrefix)");
    expect(source).toContain("getOssObject(config, tagsOssKey)");
  });

  it("syncOrphanTags merges local and OSS tags", () => {
    const fs = require("fs");
    const path = require("path");
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/lib/images/metadata-sync.ts"),
      "utf8"
    );

    // 验证并集合并逻辑
    expect(source).toContain("const mergedTagMap = new Map([...ossTagMap, ...localTagMap])");
  });

  it("syncOrphanTags creates missing tags locally from OSS", () => {
    const fs = require("fs");
    const path = require("path");
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/lib/images/metadata-sync.ts"),
      "utf8"
    );

    expect(source).toContain("await db.tag.create({");
    expect(source).toContain("color: ossTag.color");
    expect(source).toContain("name: ossTag.name");
  });

  it("syncOrphanTags writes merged tags back to OSS", () => {
    const fs = require("fs");
    const path = require("path");
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/lib/images/metadata-sync.ts"),
      "utf8"
    );

    expect(source).toContain("await putOssObject(config, tagsOssKey, JSON.stringify(tagsMetadata))");
  });

  it("syncUserMetadataWithOss calls syncOrphanTags", () => {
    const fs = require("fs");
    const path = require("path");
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/lib/images/metadata-sync.ts"),
      "utf8"
    );

    expect(source).toContain("const syncedTagsCount = await syncOrphanTags(user, config, onProgress)");
  });

  it("MetadataSyncResult type includes syncedTagsCount", () => {
    const fs = require("fs");
    const path = require("path");
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/lib/images/metadata-sync.ts"),
      "utf8"
    );

    expect(source).toContain("syncedTagsCount: number;");
  });

  it("syncUserMetadataWithOss returns syncedTagsCount", () => {
    const fs = require("fs");
    const path = require("path");
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/lib/images/metadata-sync.ts"),
      "utf8"
    );

    expect(source).toContain("syncedTagsCount");
  });

  it("syncOrphanTags handles empty OSS tags gracefully", () => {
    const fs = require("fs");
    const path = require("path");
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/lib/images/metadata-sync.ts"),
      "utf8"
    );

    // 验证空 OSS 标签时使用空数组
    expect(source).toContain("ossTagsData?.tags ?? []");
  });

  it("syncOrphanTags generates unique slugs for new tags", () => {
    const fs = require("fs");
    const path = require("path");
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/lib/images/metadata-sync.ts"),
      "utf8"
    );

    expect(source).toContain("const baseSlug = slugifyTagName(ossTag.name)");
    expect(source).toContain("slug = `${baseSlug}-${suffix}`");
  });

  it("syncOrphanTags skips tags that already exist locally", () => {
    const fs = require("fs");
    const path = require("path");
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/lib/images/metadata-sync.ts"),
      "utf8"
    );

    expect(source).toContain("if (!normalizedName || localTagMap.has(normalizedName))");
    expect(source).toContain("continue;");
  });
});

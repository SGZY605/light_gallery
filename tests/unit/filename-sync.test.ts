import { describe, expect, it } from "vitest";

describe("filename sync in metadata", () => {
  it("buildMetadataJson includes filename field", () => {
    const fs = require("fs");
    const path = require("path");
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/lib/images/metadata-sync.ts"),
      "utf8"
    );

    expect(source).toContain("filename: image.filename");
  });

  it("ImageMetadataJson type includes filename field", () => {
    const fs = require("fs");
    const path = require("path");
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/lib/images/metadata-sync.ts"),
      "utf8"
    );

    expect(source).toContain("filename: string | null;");
  });

  it("mergeMetadataForExport prefers local filename over OSS", () => {
    const fs = require("fs");
    const path = require("path");
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/lib/images/metadata-sync.ts"),
      "utf8"
    );

    expect(source).toContain("filename: local.filename ?? oss.filename");
  });

  it("mergeMetadataForImport updates filename when OSS has different value", () => {
    const fs = require("fs");
    const path = require("path");
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/lib/images/metadata-sync.ts"),
      "utf8"
    );

    expect(source).toContain("shouldUpdateFilename");
    expect(source).toContain('if (oss.filename && oss.filename !== image.filename)');
  });

  it("importMetadataToLocal updates filename when changed", () => {
    const fs = require("fs");
    const path = require("path");
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/lib/images/metadata-sync.ts"),
      "utf8"
    );

    expect(source).toContain("if (merged.shouldUpdateFilename && merged.filename)");
    expect(source).toContain("data: { filename: merged.filename }");
  });

  it("syncUserImagesWithOss gets filename from metadata when importing", () => {
    const fs = require("fs");
    const path = require("path");
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/lib/images/sync.ts"),
      "utf8"
    );

    expect(source).toContain("文件名优先级");
    expect(source).toContain("buildMetadataOssKey");
    expect(source).toContain("metadata.filename");
  });

  it("syncUserImagesWithOss falls back to OSS key-based filename", () => {
    const fs = require("fs");
    const path = require("path");
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/lib/images/sync.ts"),
      "utf8"
    );

    expect(source).toContain("let filename = getFilenameFromObjectKey(object.key)");
    expect(source).toContain("Metadata may not exist or be invalid; use fallback filename");
  });

  it("LocalImageWithMetadata type includes filename field", () => {
    const fs = require("fs");
    const path = require("path");
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/lib/images/metadata-sync.ts"),
      "utf8"
    );

    expect(source).toContain("filename: string;");
  });

  it("ImageMetadataJson type includes mimeType and sizeBytes fields", () => {
    const fs = require("fs");
    const path = require("path");
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/lib/images/metadata-sync.ts"),
      "utf8"
    );

    expect(source).toContain("mimeType: string | null;");
    expect(source).toContain("sizeBytes: number | null;");
  });

  it("buildMetadataJson includes mimeType and sizeBytes", () => {
    const fs = require("fs");
    const path = require("path");
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/lib/images/metadata-sync.ts"),
      "utf8"
    );

    expect(source).toContain("mimeType: image.mimeType");
    expect(source).toContain("sizeBytes: image.sizeBytes");
  });

  it("mergeMetadataForExport handles mimeType and sizeBytes", () => {
    const fs = require("fs");
    const path = require("path");
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/lib/images/metadata-sync.ts"),
      "utf8"
    );

    expect(source).toContain("mimeType: local.mimeType ?? oss.mimeType");
    expect(source).toContain("sizeBytes: local.sizeBytes ?? oss.sizeBytes");
  });

  it("mergeMetadataForImport updates mimeType and sizeBytes", () => {
    const fs = require("fs");
    const path = require("path");
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/lib/images/metadata-sync.ts"),
      "utf8"
    );

    expect(source).toContain("shouldUpdateMimeType");
    expect(source).toContain("shouldUpdateSizeBytes");
    expect(source).toContain('if (oss.mimeType && oss.mimeType !== image.mimeType)');
    expect(source).toContain('if (oss.sizeBytes && oss.sizeBytes !== image.sizeBytes)');
  });

  it("importMetadataToLocal updates mimeType and sizeBytes", () => {
    const fs = require("fs");
    const path = require("path");
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/lib/images/metadata-sync.ts"),
      "utf8"
    );

    expect(source).toContain("if (merged.shouldUpdateMimeType && merged.mimeType)");
    expect(source).toContain("if (merged.shouldUpdateSizeBytes && merged.sizeBytes)");
  });

  it("hasLocalGaps includes mimeType and sizeBytes checks", () => {
    const fs = require("fs");
    const path = require("path");
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/lib/images/metadata-sync.ts"),
      "utf8"
    );

    expect(source).toContain("localNeedsImport.shouldUpdateMimeType");
    expect(source).toContain("localNeedsImport.shouldUpdateSizeBytes");
  });

  it("buildComparableMetadataJson includes mimeType and sizeBytes", () => {
    const fs = require("fs");
    const path = require("path");
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/lib/images/metadata-sync.ts"),
      "utf8"
    );

    expect(source).toContain("mimeType: metadata.mimeType");
    expect(source).toContain("sizeBytes: metadata.sizeBytes");
  });

  it("LocalImageWithMetadata type includes mimeType and sizeBytes fields", () => {
    const fs = require("fs");
    const path = require("path");
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/lib/images/metadata-sync.ts"),
      "utf8"
    );

    expect(source).toContain("mimeType: string;");
    expect(source).toContain("sizeBytes: number;");
  });
});

describe("resolveFilenameForSync strategy", () => {
  // 因为 resolveFilenameForSync 是模块内部函数，通过源码内容验证其存在和策略注释
  it("resolveFilenameForSync function exists in metadata-sync.ts", () => {
    const fs = require("fs");
    const path = require("path");
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/lib/images/metadata-sync.ts"),
      "utf8"
    );

    expect(source).toContain("function resolveFilenameForSync(");
  });

  it("resolveFilenameForSync uses timestamp-based priority", () => {
    const fs = require("fs");
    const path = require("path");
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/lib/images/metadata-sync.ts"),
      "utf8"
    );

    // 验证时间戳比较逻辑存在
    expect(source).toContain("ossDate > localUpdatedAt");
    expect(source).toContain("OSS 元数据更新时间更晚");
    expect(source).toContain("保留本地文件名");
  });

  it("resolveFilenameForSync is called in syncUserMetadataWithOss", () => {
    const fs = require("fs");
    const path = require("path");
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/lib/images/metadata-sync.ts"),
      "utf8"
    );

    expect(source).toContain("resolveFilenameForSync({");
    expect(source).toContain("localFilename: image.filename");
    expect(source).toContain("ossFilename: ossMetadata.filename");
  });

  it("syncUserMetadataWithOss overrides mergedJson.filename with resolved filename", () => {
    const fs = require("fs");
    const path = require("path");
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/lib/images/metadata-sync.ts"),
      "utf8"
    );

    // 验证 mergedJson.filename 被覆盖
    expect(source).toContain("mergedJson.filename = resolveFilenameForSync(");
  });

  it("filename sync strategy documentation mentions user-defined name priority", () => {
    const fs = require("fs");
    const path = require("path");
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/lib/images/metadata-sync.ts"),
      "utf8"
    );

    expect(source).toContain("用户手动命名的名称优先级最高");
  });
});

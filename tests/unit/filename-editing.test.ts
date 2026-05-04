import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = process.cwd();

function readProjectFile(path: string): string {
  return readFileSync(join(projectRoot, path), "utf8");
}

describe("image detail sidebar - filename editing", () => {
  it("imports Pencil icon for edit button", () => {
    const source = readProjectFile("src/components/image-detail-sidebar.tsx");
    expect(source).toContain("Pencil");
    expect(source).toContain('from "lucide-react"');
  });

  it("has state variables for filename editing", () => {
    const source = readProjectFile("src/components/image-detail-sidebar.tsx");
    expect(source).toContain("isEditingFilename");
    expect(source).toContain("draftFilename");
    expect(source).toContain("savedFilename");
  });

  it("renders edit icon button between label and filename", () => {
    const source = readProjectFile("src/components/image-detail-sidebar.tsx");
    expect(source).toContain('aria-label="编辑名称"');
    expect(source).toContain("Pencil");
    expect(source).toContain("grid-cols-[92px_24px_minmax(0,1fr)]");
  });

  it("renders input field when editing filename", () => {
    const source = readProjectFile("src/components/image-detail-sidebar.tsx");
    expect(source).toContain("isEditingFilename");
    expect(source).toContain("setDraftFilename");
  });

  it("has save button for filename", () => {
    const source = readProjectFile("src/components/image-detail-sidebar.tsx");
    expect(source).toContain('aria-label="保存名称"');
    expect(source).toContain("Save");
  });

  it("supports Enter key to save and Escape to cancel", () => {
    const source = readProjectFile("src/components/image-detail-sidebar.tsx");
    expect(source).toContain('event.key === "Enter"');
    expect(source).toContain('event.key === "Escape"');
  });

  it("resets filename state when image changes", () => {
    const source = readProjectFile("src/components/image-detail-sidebar.tsx");
    expect(source).toContain("setSavedFilename(filename)");
    expect(source).toContain("setDraftFilename(filename)");
    expect(source).toContain("setIsEditingFilename(false)");
  });

  it("sends filename in save payload when changed", () => {
    const source = readProjectFile("src/components/image-detail-sidebar.tsx");
    expect(source).toContain("filename: draftFilename !== savedFilename ? draftFilename : undefined");
  });
});

describe("detail-editor - filename support", () => {
  it("accepts optional filename in BuildDetailSavePayloadInput", () => {
    const source = readProjectFile("src/lib/images/detail-editor.ts");
    expect(source).toContain("filename?: string");
  });

  it("includes filename in payload when provided", () => {
    const source = readProjectFile("src/lib/images/detail-editor.ts");
    expect(source).toContain("if (filename)");
    expect(source).toContain('payload.filename = filename');
  });
});

describe("API route - filename update support", () => {
  it("accepts optional filename in update schema", () => {
    const source = readProjectFile("src/app/api/images/[id]/route.ts");
    expect(source).toContain("filename: z.string().min(1).max(255).optional()");
  });

  it("updates filename in database when provided", () => {
    const source = readProjectFile("src/app/api/images/[id]/route.ts");
    expect(source).toContain("if (parsed.data.filename)");
    expect(source).toContain("await tx.image.update");
    expect(source).toContain("data: { filename: parsed.data.filename }");
  });

  it("makes tagIds and location optional in schema", () => {
    const source = readProjectFile("src/app/api/images/[id]/route.ts");
    expect(source).toContain("tagIds: z.array(z.string().min(1)).optional()");
    expect(source).toContain(".nullable()");
    expect(source).toContain(".optional()");
  });
});

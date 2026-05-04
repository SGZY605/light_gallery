import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = process.cwd();

function readProjectFile(path: string): string {
  return readFileSync(join(projectRoot, path), "utf8");
}

describe("copy-share-button - dynamic domain", () => {
  it("uses window.location.origin for dynamic domain", () => {
    const source = readProjectFile("src/components/copy-share-button.tsx");
    expect(source).toContain("window.location.origin");
  });

  it("constructs full share URL dynamically", () => {
    const source = readProjectFile("src/components/copy-share-button.tsx");
    expect(source).toContain("${origin}/s/${token}");
  });

  it("displays share URL in input field", () => {
    const source = readProjectFile("src/components/copy-share-button.tsx");
    expect(source).toContain("type=\"text\"");
    expect(source).toContain("readOnly");
    expect(source).toContain("value={shareUrl}");
  });

  it("has copy button with icon", () => {
    const source = readProjectFile("src/components/copy-share-button.tsx");
    expect(source).toContain("Copy");
    expect(source).toContain("navigator.clipboard.writeText");
  });

  it("shows success feedback after copy", () => {
    const source = readProjectFile("src/components/copy-share-button.tsx");
    expect(source).toContain("copied");
    expect(source).toContain("复制成功");
    expect(source).toContain("Check");
  });

  it("resets copied state after 2 seconds", () => {
    const source = readProjectFile("src/components/copy-share-button.tsx");
    expect(source).toContain("window.setTimeout(() => setCopied(false), 2000)");
  });

  it("sets share URL on mount via useEffect", () => {
    const source = readProjectFile("src/components/copy-share-button.tsx");
    expect(source).toContain("useEffect");
    expect(source).toContain("setShareUrl");
  });

  it("selects input text on click", () => {
    const source = readProjectFile("src/components/copy-share-button.tsx");
    expect(source).toContain("e.currentTarget.select()");
  });
});

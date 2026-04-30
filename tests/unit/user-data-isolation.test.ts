import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = process.cwd();

function readProjectFile(path: string): string {
  return readFileSync(join(projectRoot, path), "utf8");
}

describe("dashboard user data isolation contracts", () => {
  it.each([
    "src/app/dashboard/library/page.tsx",
    "src/app/dashboard/albums/page.tsx",
    "src/app/dashboard/map/page.tsx"
  ])("%s scopes images and tags to the current user", (path) => {
    const content = readProjectFile(path);

    expect(content).toContain("requireUser");
    expect(content).toContain("uploaderId: user.id");
    expect(content).toContain("creatorId: user.id");
    expect(content).toContain("resolveUserOssConfig");
  });

  it("upload page only offers current user's tags", () => {
    const content = readProjectFile("src/app/dashboard/upload/page.tsx");

    expect(content).toContain("requireUser");
    expect(content).toContain("creatorId: user.id");
  });

  it("image detail page only opens current user's image and tags", () => {
    const content = readProjectFile("src/app/dashboard/library/[id]/page.tsx");

    expect(content).toContain("requireUser");
    expect(content).toContain("uploaderId: user.id");
    expect(content).toContain("creatorId: user.id");
    expect(content).toContain("resolveUserOssConfig");
  });
});

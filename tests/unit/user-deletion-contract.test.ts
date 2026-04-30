import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = process.cwd();

function readProjectFile(path: string): string {
  return readFileSync(join(projectRoot, path), "utf8");
}

describe("user deletion isolation contract", () => {
  it("deletes user-owned business data and config instead of reassigning it", () => {
    const content = readProjectFile("src/app/dashboard/users/page.tsx");

    expect(content).not.toContain("protectedAdmin");
    expect(content).not.toContain("data: { uploaderId:");
    expect(content).not.toContain("data: { creatorId:");
    expect(content).not.toContain("data: { updatedById:");
    expect(content).not.toContain("data: { actorId:");
    expect(content).toContain("tx.userOssConfig.deleteMany");
    expect(content).toContain("tx.image.deleteMany");
    expect(content).toContain("tx.tag.deleteMany");
    expect(content).toContain("tx.share.deleteMany");
    expect(content).toContain("tx.uploadSession.deleteMany");
    expect(content).toContain("tx.imageLocationOverride.deleteMany");
  });

  it("keeps the protected super administrator non-deletable", () => {
    const content = readProjectFile("src/app/dashboard/users/page.tsx");

    expect(content).toContain("canDeleteUserAccount(targetUser.email)");
    expect(content).toContain("PROTECTED_ADMIN_EMAIL");
  });
});

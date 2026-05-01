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
    expect(content).toContain("支持创建其他账户、修改管理员、重置密码和删除账户等管理操作");
    expect(content).not.toContain("进入其他用户");
  });

  it("requires typing the exact account name before the delete user confirmation can submit", () => {
    const content = readProjectFile("src/components/delete-user-button.tsx");
    const dialog = readProjectFile("src/components/confirm-dialog.tsx");

    expect(content).toContain("confirmationText={userName}");
    expect(content).toContain('confirmationLabel="输入账户名以确认删除"');
    expect(dialog).toContain("confirmInput === confirmationText");
    expect(dialog).toContain("disabled={isConfirmDisabled}");
    expect(dialog).toContain("setConfirmInput");
  });
});

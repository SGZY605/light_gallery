import { describe, expect, it } from "vitest";

describe("change password functionality", () => {
  it("ChangePasswordForm component exists", () => {
    const fs = require("fs");
    const path = require("path");
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/components/change-password-form.tsx"),
      "utf8"
    );

    expect(source).toContain("export function ChangePasswordForm");
  });

  it("ChangePasswordForm has three password inputs", () => {
    const fs = require("fs");
    const path = require("path");
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/components/change-password-form.tsx"),
      "utf8"
    );

    expect(source).toContain("原密码");
    expect(source).toContain("新密码");
    expect(source).toContain("确认新密码");
  });

  it("ChangePasswordForm has submit button", () => {
    const fs = require("fs");
    const path = require("path");
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/components/change-password-form.tsx"),
      "utf8"
    );

    expect(source).toContain("确认修改");
    expect(source).toContain('type="submit"');
  });

  it("ChangePasswordForm validates password length", () => {
    const fs = require("fs");
    const path = require("path");
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/components/change-password-form.tsx"),
      "utf8"
    );

    expect(source).toContain("新密码长度至少 5 个字符");
  });

  it("ChangePasswordForm validates password match", () => {
    const fs = require("fs");
    const path = require("path");
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/components/change-password-form.tsx"),
      "utf8"
    );

    expect(source).toContain("两次输入的新密码不一致");
  });

  it("ChangePasswordForm calls /api/user/password", () => {
    const fs = require("fs");
    const path = require("path");
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/components/change-password-form.tsx"),
      "utf8"
    );

    expect(source).toContain('/api/user/password');
    expect(source).toContain('method: "PUT"');
  });

  it("Password API route exists", () => {
    const fs = require("fs");
    const path = require("path");
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/app/api/user/password/route.ts"),
      "utf8"
    );

    expect(source).toContain("export async function PUT");
  });

  it("Password API verifies current password", () => {
    const fs = require("fs");
    const path = require("path");
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/app/api/user/password/route.ts"),
      "utf8"
    );

    expect(source).toContain("verifyPassword");
    expect(source).toContain("原密码错误");
  });

  it("Password API hashes new password", () => {
    const fs = require("fs");
    const path = require("path");
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/app/api/user/password/route.ts"),
      "utf8"
    );

    expect(source).toContain("hashPassword");
  });

  it("Password API validates minimum length", () => {
    const fs = require("fs");
    const path = require("path");
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/app/api/user/password/route.ts"),
      "utf8"
    );

    expect(source).toContain("MIN_PASSWORD_LENGTH");
  });

  it("Settings page includes ChangePasswordForm", () => {
    const fs = require("fs");
    const path = require("path");
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/app/dashboard/settings/page.tsx"),
      "utf8"
    );

    expect(source).toContain('import { ChangePasswordForm }');
    expect(source).toContain("<ChangePasswordForm />");
    expect(source).toContain("修改密码");
  });
});

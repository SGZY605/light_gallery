import { describe, expect, it } from "vitest";
import { canDeleteUserAccount, canChangeUserRole, PROTECTED_ADMIN_EMAIL } from "@/lib/auth/protected-admin";

describe("protected admin rules", () => {
  it("prevents deleting the protected admin account", () => {
    expect(canDeleteUserAccount(PROTECTED_ADMIN_EMAIL)).toBe(false);
    expect(canDeleteUserAccount("member@example.com")).toBe(true);
  });

  it("prevents demoting the protected admin account", () => {
    expect(canChangeUserRole(PROTECTED_ADMIN_EMAIL, "ADMIN")).toBe(true);
    expect(canChangeUserRole(PROTECTED_ADMIN_EMAIL, "MEMBER")).toBe(false);
    expect(canChangeUserRole("member@example.com", "MEMBER")).toBe(true);
  });
});

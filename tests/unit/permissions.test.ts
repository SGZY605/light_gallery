import { describe, expect, it } from "vitest";
import { canManageUsers, canUpload, canRevokeShare } from "@/lib/auth/permissions";

describe("permissions", () => {
  it("allows owner and admin to manage users", () => {
    expect(canManageUsers("OWNER")).toBe(true);
    expect(canManageUsers("ADMIN")).toBe(true);
    expect(canManageUsers("MEMBER")).toBe(false);
  });

  it("allows all active roles to upload", () => {
    expect(canUpload("OWNER")).toBe(true);
    expect(canUpload("ADMIN")).toBe(true);
    expect(canUpload("MEMBER")).toBe(true);
  });

  it("allows owner and admin to revoke shares", () => {
    expect(canRevokeShare("OWNER")).toBe(true);
    expect(canRevokeShare("ADMIN")).toBe(true);
    expect(canRevokeShare("MEMBER")).toBe(false);
  });
});

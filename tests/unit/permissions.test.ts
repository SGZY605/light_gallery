import { describe, expect, it } from "vitest";
import { canManageUsers, canUpload, canRevokeShare } from "@/lib/auth/permissions";

describe("permissions", () => {
  it("allows only admins to manage users", () => {
    expect(canManageUsers("ADMIN")).toBe(true);
    expect(canManageUsers("MEMBER")).toBe(false);
  });

  it("allows admins and members to upload", () => {
    expect(canUpload("ADMIN")).toBe(true);
    expect(canUpload("MEMBER")).toBe(true);
  });

  it("allows only admins to revoke shares", () => {
    expect(canRevokeShare("ADMIN")).toBe(true);
    expect(canRevokeShare("MEMBER")).toBe(false);
  });
});

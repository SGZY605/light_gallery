import type { UserRole } from "@prisma/client";

type Role = UserRole;

export function canManageUsers(role: Role): boolean {
  return role === "ADMIN";
}

export function canUpload(role: Role): boolean {
  return role === "ADMIN" || role === "MEMBER";
}

export function canRevokeShare(role: Role): boolean {
  return role === "ADMIN";
}

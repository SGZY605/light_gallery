import type { UserRole } from "@prisma/client";

type Role = UserRole;

const elevatedRoles = new Set<Role>(["OWNER", "ADMIN"]);
const activeRoles = new Set<Role>(["OWNER", "ADMIN", "MEMBER"]);

export function canManageUsers(role: Role): boolean {
  return elevatedRoles.has(role);
}

export function canUpload(role: Role): boolean {
  return activeRoles.has(role);
}

export function canRevokeShare(role: Role): boolean {
  return elevatedRoles.has(role);
}

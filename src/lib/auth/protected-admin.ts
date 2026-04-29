import type { UserRole } from "@prisma/client";
import { normalizeEmail } from "@/lib/auth/password";

export const PROTECTED_ADMIN_EMAIL = "admin@example.com";

export function isProtectedAdminEmail(email: string): boolean {
  return normalizeEmail(email) === PROTECTED_ADMIN_EMAIL;
}

export function canDeleteUserAccount(email: string): boolean {
  return !isProtectedAdminEmail(email);
}

export function canChangeUserRole(email: string, nextRole: UserRole): boolean {
  return !isProtectedAdminEmail(email) || nextRole === "ADMIN";
}

import { randomBytes } from "node:crypto";

export type ShareState = "active" | "revoked" | "expired";

type ShareStateInput = {
  expiresAt?: Date | string | null;
  revoked: boolean;
  revokedAt?: Date | string | null;
};

export function createShareToken(): string {
  return randomBytes(24).toString("base64url");
}

export function getShareState(share: ShareStateInput, now: Date = new Date()): ShareState {
  if (share.revoked || share.revokedAt) {
    return "revoked";
  }

  if (share.expiresAt) {
    const expiresAt = share.expiresAt instanceof Date ? share.expiresAt : new Date(share.expiresAt);

    if (!Number.isNaN(expiresAt.getTime()) && expiresAt <= now) {
      return "expired";
    }
  }

  return "active";
}

export function isShareAccessible(share: ShareStateInput, now?: Date): boolean {
  return getShareState(share, now) === "active";
}

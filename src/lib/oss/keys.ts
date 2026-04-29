import { randomUUID } from "node:crypto";
import path from "node:path";

export function sanitizeOssFilename(filename: string): string {
  const parsed = path.parse(filename);
  const normalizedBaseName = parsed.name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const safeBaseName =
    normalizedBaseName.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) ||
    "image";
  const safeExtension = parsed.ext.toLowerCase().replace(/[^a-z0-9.]/g, "").slice(0, 10);

  return `${safeBaseName}${safeExtension}`;
}

export function buildOssObjectKey(filename: string, uploadPrefix: string): string {
  const now = new Date();
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const identifier = randomUUID().replace(/-/g, "");

  return `${uploadPrefix}/${year}/${month}/${identifier}-${sanitizeOssFilename(filename)}`;
}

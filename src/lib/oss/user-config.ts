import type { User } from "@prisma/client";
import { PROTECTED_ADMIN_EMAIL } from "@/lib/auth/protected-admin";
import { db } from "@/lib/db";

export type ResolvedOssConfig = {
  accessKeyId: string;
  accessKeySecret: string;
  allowedMimePrefix: string;
  bucket: string;
  maxUploadBytes: number;
  metadataPrefix: string;
  policyExpiresSeconds: number;
  publicBaseUrl: string;
  region: string;
  uploadBaseUrl: string;
  uploadPrefix: string;
};

export type UserOssConfigRecord = ResolvedOssConfig;

type UserIdentity = Pick<User, "email" | "id">;

type ResolveUserOssConfigInput = {
  env?: NodeJS.ProcessEnv | Record<string, string | undefined>;
  findConfig?: (userId: string) => Promise<UserOssConfigRecord | null>;
  user: UserIdentity;
};

const DEFAULT_MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
const DEFAULT_METADATA_PREFIX = "metadata";
const DEFAULT_POLICY_EXPIRES_SECONDS = 300;
const DEFAULT_ALLOWED_MIME_PREFIX = "image/";
const DEFAULT_UPLOAD_PREFIX = "uploads";

const requiredFields = [
  "region",
  "bucket",
  "accessKeyId",
  "accessKeySecret",
  "publicBaseUrl",
  "uploadBaseUrl"
] as const;

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function normalizeObjectPrefix(value: string | undefined, fallback: string): string {
  return value?.trim().replace(/^\/+|\/+$/g, "") || fallback;
}

function readPositiveInteger(value: string | undefined, fallback: number): number {
  const rawValue = value?.trim();

  if (!rawValue) {
    return fallback;
  }

  const parsedValue = Number.parseInt(rawValue, 10);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    return fallback;
  }

  return parsedValue;
}

function buildRegionHost(region: string): string {
  return region.includes(".") ? region : `${region.startsWith("oss-") ? region : `oss-${region}`}.aliyuncs.com`;
}

function buildDefaultUploadBaseUrl(bucket: string, region: string): string {
  return `https://${bucket}.${buildRegionHost(region)}`;
}

export function normalizeOssBaseUrl(value: string, bucket: string, region: string): string {
  const trimmedValue = trimTrailingSlash(value.trim());

  try {
    const url = new URL(trimmedValue);
    const regionHost = buildRegionHost(region);

    if (url.hostname === regionHost) {
      url.hostname = `${bucket}.${regionHost}`;
    }

    return trimTrailingSlash(url.toString());
  } catch {
    return trimmedValue;
  }
}

export function buildEnvOssConfig(env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env) {
  const region = env.OSS_REGION?.trim();
  const bucket = env.OSS_BUCKET?.trim();
  const accessKeyId = env.OSS_ACCESS_KEY_ID?.trim();
  const accessKeySecret = env.OSS_ACCESS_KEY_SECRET?.trim();

  if (!region || !bucket || !accessKeyId || !accessKeySecret) {
    return null;
  }

  const uploadBaseUrl = normalizeOssBaseUrl(
    env.OSS_UPLOAD_BASE_URL?.trim() || buildDefaultUploadBaseUrl(bucket, region),
    bucket,
    region
  );

  return {
    accessKeyId,
    accessKeySecret,
    allowedMimePrefix: env.OSS_ALLOWED_MIME_PREFIX?.trim() || DEFAULT_ALLOWED_MIME_PREFIX,
    bucket,
    maxUploadBytes: readPositiveInteger(env.OSS_MAX_UPLOAD_BYTES, DEFAULT_MAX_UPLOAD_BYTES),
    metadataPrefix: normalizeObjectPrefix(env.OSS_METADATA_PREFIX, DEFAULT_METADATA_PREFIX),
    policyExpiresSeconds: readPositiveInteger(
      env.OSS_POLICY_EXPIRES_SECONDS,
      DEFAULT_POLICY_EXPIRES_SECONDS
    ),
    publicBaseUrl: normalizeOssBaseUrl(env.OSS_PUBLIC_BASE_URL?.trim() || uploadBaseUrl, bucket, region),
    region,
    uploadBaseUrl,
    uploadPrefix: normalizeObjectPrefix(env.OSS_UPLOAD_PREFIX, DEFAULT_UPLOAD_PREFIX)
  } satisfies ResolvedOssConfig;
}

export function normalizeUserOssConfig(config: UserOssConfigRecord): ResolvedOssConfig {
  return {
    accessKeyId: config.accessKeyId.trim(),
    accessKeySecret: config.accessKeySecret.trim(),
    allowedMimePrefix: config.allowedMimePrefix.trim() || DEFAULT_ALLOWED_MIME_PREFIX,
    bucket: config.bucket.trim(),
    maxUploadBytes: config.maxUploadBytes || DEFAULT_MAX_UPLOAD_BYTES,
    metadataPrefix: normalizeObjectPrefix(config.metadataPrefix, DEFAULT_METADATA_PREFIX),
    policyExpiresSeconds: config.policyExpiresSeconds || DEFAULT_POLICY_EXPIRES_SECONDS,
    publicBaseUrl: normalizeOssBaseUrl(config.publicBaseUrl, config.bucket, config.region),
    region: config.region.trim(),
    uploadBaseUrl: normalizeOssBaseUrl(config.uploadBaseUrl, config.bucket, config.region),
    uploadPrefix: normalizeObjectPrefix(config.uploadPrefix, DEFAULT_UPLOAD_PREFIX)
  };
}

export function getMissingOssConfigFields(config: UserOssConfigRecord | null): string[] {
  if (!config) {
    return [...requiredFields];
  }

  const normalizedConfig = normalizeUserOssConfig(config);

  return requiredFields.filter((field) => !normalizedConfig[field].trim());
}

export function hasUsableOssConfig(config: UserOssConfigRecord | null): boolean {
  return getMissingOssConfigFields(config).length === 0;
}

export async function resolveUserOssConfig({
  env = process.env,
  findConfig = async (userId) => db.userOssConfig.findUnique({ where: { userId } }),
  user
}: ResolveUserOssConfigInput): Promise<ResolvedOssConfig | null> {
  const savedConfig = await findConfig(user.id);

  if (savedConfig && hasUsableOssConfig(savedConfig)) {
    return normalizeUserOssConfig(savedConfig);
  }

  if (user.email !== PROTECTED_ADMIN_EMAIL) {
    return null;
  }

  return buildEnvOssConfig(env);
}

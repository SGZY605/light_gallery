export type OssConfig = {
  accessKeyId: string;
  accessKeySecret: string;
  allowedMimePrefix: string;
  bucket: string;
  maxUploadBytes: number;
  policyExpiresSeconds: number;
  publicBaseUrl: string;
  region: string;
  uploadBaseUrl: string;
  uploadPrefix: string;
};

const DEFAULT_MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
const DEFAULT_POLICY_EXPIRES_SECONDS = 300;
const DEFAULT_ALLOWED_MIME_PREFIX = "image/";
const DEFAULT_UPLOAD_PREFIX = "uploads";

function readRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
}

function readPositiveIntegerEnv(name: string, fallback: number): number {
  const rawValue = process.env[name]?.trim();

  if (!rawValue) {
    return fallback;
  }

  const parsedValue = Number.parseInt(rawValue, 10);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }

  return parsedValue;
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function buildDefaultUploadBaseUrl(bucket: string, region: string): string {
  const regionHost = region.includes(".")
    ? region
    : `${region.startsWith("oss-") ? region : `oss-${region}`}.aliyuncs.com`;

  return `https://${bucket}.${regionHost}`;
}

export function getOssConfig(): OssConfig {
  const bucket = readRequiredEnv("OSS_BUCKET");
  const region = readRequiredEnv("OSS_REGION");
  const uploadBaseUrl = trimTrailingSlash(
    process.env.OSS_UPLOAD_BASE_URL?.trim() ?? buildDefaultUploadBaseUrl(bucket, region)
  );

  return {
    accessKeyId: readRequiredEnv("OSS_ACCESS_KEY_ID"),
    accessKeySecret: readRequiredEnv("OSS_ACCESS_KEY_SECRET"),
    allowedMimePrefix: process.env.OSS_ALLOWED_MIME_PREFIX?.trim() || DEFAULT_ALLOWED_MIME_PREFIX,
    bucket,
    maxUploadBytes: readPositiveIntegerEnv("OSS_MAX_UPLOAD_BYTES", DEFAULT_MAX_UPLOAD_BYTES),
    policyExpiresSeconds: readPositiveIntegerEnv(
      "OSS_POLICY_EXPIRES_SECONDS",
      DEFAULT_POLICY_EXPIRES_SECONDS
    ),
    publicBaseUrl: trimTrailingSlash(process.env.OSS_PUBLIC_BASE_URL?.trim() || uploadBaseUrl),
    region,
    uploadBaseUrl,
    uploadPrefix: process.env.OSS_UPLOAD_PREFIX?.trim() || DEFAULT_UPLOAD_PREFIX
  };
}

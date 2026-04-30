import { describe, expect, it, vi } from "vitest";
import { PROTECTED_ADMIN_EMAIL } from "@/lib/auth/protected-admin";
import {
  buildEnvOssConfig,
  getMissingOssConfigFields,
  resolveUserOssConfig,
  type UserOssConfigRecord
} from "@/lib/oss/user-config";

const env = {
  OSS_REGION: "cn-shanghai",
  OSS_BUCKET: "admin-bucket",
  OSS_ACCESS_KEY_ID: "admin-key",
  OSS_ACCESS_KEY_SECRET: "admin-secret",
  OSS_PUBLIC_BASE_URL: "https://cdn.example.com",
  OSS_UPLOAD_BASE_URL: "https://admin-bucket.oss-cn-shanghai.aliyuncs.com",
  OSS_UPLOAD_PREFIX: "admin-uploads",
  OSS_MAX_UPLOAD_BYTES: "123456",
  OSS_POLICY_EXPIRES_SECONDS: "600",
  OSS_ALLOWED_MIME_PREFIX: "image/"
};

function userConfig(overrides: Partial<UserOssConfigRecord> = {}): UserOssConfigRecord {
  return {
    accessKeyId: "user-key",
    accessKeySecret: "user-secret",
    allowedMimePrefix: "image/",
    bucket: "user-bucket",
    maxUploadBytes: 25 * 1024 * 1024,
    policyExpiresSeconds: 300,
    publicBaseUrl: "https://user-cdn.example.com",
    region: "cn-hangzhou",
    uploadBaseUrl: "https://user-bucket.oss-cn-hangzhou.aliyuncs.com",
    uploadPrefix: "uploads",
    ...overrides
  };
}

describe("user OSS config resolution", () => {
  it("uses saved per-user OSS config before env values", async () => {
    const config = await resolveUserOssConfig({
      user: {
        email: PROTECTED_ADMIN_EMAIL,
        id: "admin"
      },
      env,
      findConfig: vi.fn().mockResolvedValue(userConfig())
    });

    expect(config?.bucket).toBe("user-bucket");
    expect(config?.accessKeyId).toBe("user-key");
    expect(config?.publicBaseUrl).toBe("https://user-cdn.example.com");
  });

  it("allows only the protected super administrator to fall back to env OSS config", async () => {
    const adminConfig = await resolveUserOssConfig({
      user: {
        email: PROTECTED_ADMIN_EMAIL,
        id: "admin"
      },
      env,
      findConfig: vi.fn().mockResolvedValue(null)
    });
    const memberConfig = await resolveUserOssConfig({
      user: {
        email: "member@example.com",
        id: "member"
      },
      env,
      findConfig: vi.fn().mockResolvedValue(null)
    });

    expect(adminConfig?.bucket).toBe("admin-bucket");
    expect(memberConfig).toBeNull();
  });

  it("normalizes env OSS upload and public base URLs", () => {
    const config = buildEnvOssConfig({
      OSS_REGION: "cn-shanghai",
      OSS_BUCKET: "gallery",
      OSS_ACCESS_KEY_ID: "key",
      OSS_ACCESS_KEY_SECRET: "secret",
      OSS_PUBLIC_BASE_URL: "https://oss-cn-shanghai.aliyuncs.com/",
      OSS_UPLOAD_BASE_URL: "https://oss-cn-shanghai.aliyuncs.com/"
    });

    expect(config?.publicBaseUrl).toBe("https://gallery.oss-cn-shanghai.aliyuncs.com");
    expect(config?.uploadBaseUrl).toBe("https://gallery.oss-cn-shanghai.aliyuncs.com");
  });

  it("reports missing fields instead of building incomplete config", () => {
    const incompleteConfig = userConfig({
      accessKeySecret: "",
      publicBaseUrl: ""
    });

    expect(getMissingOssConfigFields(incompleteConfig)).toEqual(["accessKeySecret", "publicBaseUrl"]);
  });
});

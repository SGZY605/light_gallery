import { createHmac } from "node:crypto";
import type { OssConfig } from "@/lib/oss/config";

export type OssUploadFields = {
  "Content-Type": string;
  OSSAccessKeyId: string;
  key: string;
  policy: string;
  signature: string;
  success_action_status: "200";
};

export type OssUploadPolicy = {
  expiresAt: string;
  fields: OssUploadFields;
  uploadUrl: string;
};

type CreateOssUploadPolicyInput = {
  config: OssConfig;
  key: string;
  mimeType: string;
};

export function createOssUploadPolicy({
  config,
  key,
  mimeType
}: CreateOssUploadPolicyInput): OssUploadPolicy {
  const expiresAt = new Date(Date.now() + config.policyExpiresSeconds * 1000).toISOString();
  const policyDocument = {
    expiration: expiresAt,
    conditions: [
      ["content-length-range", 0, config.maxUploadBytes],
      ["starts-with", "$Content-Type", config.allowedMimePrefix],
      ["eq", "$key", key],
      ["eq", "$success_action_status", "200"]
    ]
  };
  const policy = Buffer.from(JSON.stringify(policyDocument)).toString("base64");
  const signature = createHmac("sha1", config.accessKeySecret).update(policy).digest("base64");

  return {
    expiresAt,
    fields: {
      "Content-Type": mimeType,
      OSSAccessKeyId: config.accessKeyId,
      key,
      policy,
      signature,
      success_action_status: "200"
    },
    uploadUrl: config.uploadBaseUrl
  };
}

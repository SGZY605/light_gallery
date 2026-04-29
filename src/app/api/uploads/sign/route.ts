import { NextResponse } from "next/server";
import { z } from "zod";
import { canUpload } from "@/lib/auth/permissions";
import { getCurrentUser } from "@/lib/auth/session";
import { getOssConfig } from "@/lib/oss/config";
import { buildOssObjectKey } from "@/lib/oss/keys";
import { createOssUploadPolicy } from "@/lib/oss/policy";

const INVALID_REQUEST = "上传请求无效。";
const UNAUTHORIZED = "请先登录后再上传图片。";
const FORBIDDEN = "当前账号没有上传图片的权限。";
const INVALID_MIME = "只允许上传图片文件。";
const FILE_TOO_LARGE = "所选文件超过了当前配置的上传大小上限。";

const requestSchema = z.object({
  filename: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().min(1).max(255),
  sizeBytes: z.number().int().positive()
});

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: UNAUTHORIZED }, { status: 401 });
  }

  if (!canUpload(user.role)) {
    return NextResponse.json({ error: FORBIDDEN }, { status: 403 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: INVALID_REQUEST }, { status: 400 });
  }

  const parsedRequest = requestSchema.safeParse(body);

  if (!parsedRequest.success) {
    return NextResponse.json({ error: INVALID_REQUEST }, { status: 400 });
  }

  const { filename, mimeType, sizeBytes } = parsedRequest.data;
  const config = getOssConfig();

  if (!mimeType.startsWith(config.allowedMimePrefix)) {
    return NextResponse.json({ error: INVALID_MIME }, { status: 400 });
  }

  if (sizeBytes > config.maxUploadBytes) {
    return NextResponse.json({ error: FILE_TOO_LARGE }, { status: 413 });
  }

  const key = buildOssObjectKey(filename, config.uploadPrefix);
  const uploadPolicy = createOssUploadPolicy({
    config,
    key,
    mimeType
  });

  return NextResponse.json({
    expiresAt: uploadPolicy.expiresAt,
    fields: uploadPolicy.fields,
    uploadUrl: uploadPolicy.uploadUrl
  });
}

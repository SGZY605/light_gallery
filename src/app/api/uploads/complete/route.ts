import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { canUpload } from "@/lib/auth/permissions";
import { getCurrentUser } from "@/lib/auth/session";
import { resolveUserOssConfig } from "@/lib/oss/user-config";
import {
  INVALID_TAGS,
  persistUploadedImage,
  serializeUploadedImage
} from "@/lib/uploads/persist";

const INVALID_REQUEST = "上传完成请求无效。";
const UNAUTHORIZED = "请先登录后再完成上传。";
const FORBIDDEN = "当前账号没有上传图片的权限。";
const DUPLICATE_OBJECT_KEY = "这个对象键对应的图片已经存在。";

const OSS_CONFIG_REQUIRED = "oss_config_required";

const requestSchema = z.object({
  objectKey: z.string().trim().min(1).max(1024),
  filename: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().min(1).max(255),
  sizeBytes: z.number().int().positive(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  description: z.string().trim().max(2000).optional(),
  exif: z.unknown().optional(),
  tagIds: z.array(z.string().trim().min(1)).max(50).optional(),
  tagNames: z.array(z.string().trim().min(1).max(64)).max(50).optional(),
  uploadItemId: z.string().trim().min(1).optional()
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

  const ossConfig = await resolveUserOssConfig({ user });

  if (!ossConfig) {
    return NextResponse.json({ error: OSS_CONFIG_REQUIRED }, { status: 428 });
  }

  try {
    const result = await persistUploadedImage(parsedRequest.data, user);

    return NextResponse.json({
      image: serializeUploadedImage(result)
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: DUPLICATE_OBJECT_KEY }, { status: 409 });
    }

    if (error instanceof Error && error.message === INVALID_TAGS) {
      return NextResponse.json({ error: INVALID_TAGS }, { status: 400 });
    }

    throw error;
  }
}

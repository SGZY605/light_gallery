import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { canUpload } from "@/lib/auth/permissions";
import { getCurrentUser } from "@/lib/auth/session";
import { buildOssObjectKey } from "@/lib/oss/keys";
import { createOssUploadPolicy } from "@/lib/oss/policy";
import {
  resolveUserOssConfig,
  type ResolvedOssConfig
} from "@/lib/oss/user-config";
import {
  INVALID_TAGS,
  persistUploadedImage,
  serializeUploadedImage
} from "@/lib/uploads/persist";

const INVALID_REQUEST = "上传请求无效。";
const UNAUTHORIZED = "请先登录后再上传图片。";
const FORBIDDEN = "当前账号没有上传图片的权限。";
const INVALID_MIME = "只允许上传图片文件。";
const FILE_TOO_LARGE = "所选文件超过了当前配置的上传大小上限。";
const OSS_UPLOAD_FAILED = "上传到 OSS 失败。";
const DUPLICATE_OBJECT_KEY = "这个对象键对应的图片已经存在。";

const OSS_CONFIG_REQUIRED = "oss_config_required";

function parseOptionalPositiveInteger(value: FormDataEntryValue | null): number | undefined {
  if (typeof value !== "string" || !value.trim()) {
    return undefined;
  }

  const parsedValue = Number.parseInt(value, 10);
  return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : undefined;
}

function parseOptionalJsonArray(value: FormDataEntryValue | null): string[] | undefined {
  if (typeof value !== "string" || !value.trim()) {
    return undefined;
  }

  try {
    const parsedValue: unknown = JSON.parse(value);

    if (!Array.isArray(parsedValue)) {
      return undefined;
    }

    return parsedValue.filter((item): item is string => typeof item === "string");
  } catch {
    return undefined;
  }
}

function parseOptionalJson(value: FormDataEntryValue | null): unknown {
  if (typeof value !== "string" || !value.trim()) {
    return undefined;
  }

  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

async function uploadFileToOss({
  config,
  file,
  objectKey,
  mimeType
}: {
  config: ResolvedOssConfig;
  file: File;
  objectKey: string;
  mimeType: string;
}) {
  const uploadPolicy = createOssUploadPolicy({
    config,
    key: objectKey,
    mimeType
  });
  const formData = new FormData();

  Object.entries(uploadPolicy.fields).forEach(([key, value]) => {
    formData.append(key, value);
  });
  formData.append("file", file);

  const response = await fetch(uploadPolicy.uploadUrl, {
    method: "POST",
    body: formData
  });

  if (!response.ok) {
    throw new Error(OSS_UPLOAD_FAILED);
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: UNAUTHORIZED }, { status: 401 });
  }

  if (!canUpload(user.role)) {
    return NextResponse.json({ error: FORBIDDEN }, { status: 403 });
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: INVALID_REQUEST }, { status: 400 });
  }

  const file = formData.get("file");

  if (!(file instanceof File) || !file.name || file.size <= 0) {
    return NextResponse.json({ error: INVALID_REQUEST }, { status: 400 });
  }

  const config = await resolveUserOssConfig({ user });

  if (!config) {
    return NextResponse.json({ error: OSS_CONFIG_REQUIRED }, { status: 428 });
  }

  const mimeType = file.type || "application/octet-stream";

  if (!mimeType.startsWith(config.allowedMimePrefix)) {
    return NextResponse.json({ error: INVALID_MIME }, { status: 400 });
  }

  if (file.size > config.maxUploadBytes) {
    return NextResponse.json({ error: FILE_TOO_LARGE }, { status: 413 });
  }

  const objectKey = buildOssObjectKey(file.name, config.uploadPrefix);
  const description = formData.get("description");

  try {
    await uploadFileToOss({
      config,
      file,
      objectKey,
      mimeType
    });

    const image = await persistUploadedImage(
      {
        objectKey,
        filename: file.name,
        mimeType,
        sizeBytes: file.size,
        width: parseOptionalPositiveInteger(formData.get("width")),
        height: parseOptionalPositiveInteger(formData.get("height")),
        description: typeof description === "string" ? description.trim() || undefined : undefined,
        exif: parseOptionalJson(formData.get("exif")),
        tagIds: parseOptionalJsonArray(formData.get("tagIds")),
        tagNames: parseOptionalJsonArray(formData.get("tagNames"))
      },
      user
    );

    return NextResponse.json({
      image: serializeUploadedImage(image)
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: DUPLICATE_OBJECT_KEY }, { status: 409 });
    }

    if (error instanceof Error && error.message === INVALID_TAGS) {
      return NextResponse.json({ error: INVALID_TAGS }, { status: 400 });
    }

    if (error instanceof Error && error.message === OSS_UPLOAD_FAILED) {
      return NextResponse.json({ error: OSS_UPLOAD_FAILED }, { status: 502 });
    }

    throw error;
  }
}

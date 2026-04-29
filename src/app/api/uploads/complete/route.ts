import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { writeAuditLog } from "@/lib/audit";
import { canUpload } from "@/lib/auth/permissions";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { normalizeExif } from "@/lib/images/exif";
import { normalizeTagName, slugifyTagName } from "@/lib/tags";

const INVALID_REQUEST = "上传完成请求无效。";
const UNAUTHORIZED = "请先登录后再完成上传。";
const FORBIDDEN = "当前账号没有上传图片的权限。";
const INVALID_TAGS = "所选标签中存在无效项。";
const DUPLICATE_OBJECT_KEY = "这个对象键对应的图片已经存在。";

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

function uniqueValues(values: string[] | undefined): string[] {
  return Array.from(new Set(values?.map((value) => value.trim()).filter(Boolean) ?? []));
}

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

  const tagIds = uniqueValues(parsedRequest.data.tagIds);
  const tagNames = uniqueValues(parsedRequest.data.tagNames).map(normalizeTagName);
  const normalizedExif = normalizeExif(parsedRequest.data.exif);
  const imageWidth = parsedRequest.data.width ?? normalizedExif?.width ?? undefined;
  const imageHeight = parsedRequest.data.height ?? normalizedExif?.height ?? undefined;

  try {
    const result = await db.$transaction(async (tx) => {
      const existingTags = tagIds.length
        ? await tx.tag.findMany({
            where: {
              id: {
                in: tagIds
              }
            }
          })
        : [];

      if (existingTags.length !== tagIds.length) {
        throw new Error(INVALID_TAGS);
      }

      const createdOrUpdatedTags = await Promise.all(
        tagNames.map((name) =>
          tx.tag.upsert({
            where: { slug: slugifyTagName(name) },
            update: { name },
            create: {
              name,
              slug: slugifyTagName(name),
              creatorId: user.id
            }
          })
        )
      );

      const finalTagIds = Array.from(
        new Set([...existingTags.map((tag) => tag.id), ...createdOrUpdatedTags.map((tag) => tag.id)])
      );

      const image = await tx.image.create({
        data: {
          objectKey: parsedRequest.data.objectKey,
          filename: parsedRequest.data.filename,
          mimeType: parsedRequest.data.mimeType,
          sizeBytes: parsedRequest.data.sizeBytes,
          width: imageWidth,
          height: imageHeight,
          description: parsedRequest.data.description || null,
          uploaderId: user.id,
          tags: finalTagIds.length
            ? {
                create: finalTagIds.map((tagId) => ({
                  tagId
                }))
              }
            : undefined,
          exif: normalizedExif
            ? {
                create: normalizedExif
              }
            : undefined
        },
        include: {
          exif: true,
          tags: {
            include: {
              tag: true
            }
          }
        }
      });

      if (parsedRequest.data.uploadItemId) {
        await tx.uploadItem.updateMany({
          where: {
            id: parsedRequest.data.uploadItemId
          },
          data: {
            imageId: image.id,
            objectKey: parsedRequest.data.objectKey,
            status: "COMPLETE",
            errorMessage: null
          }
        });
      }

      await writeAuditLog(
        {
          actorId: user.id,
          action: "UPLOAD_COMPLETED",
          entityType: "image",
          entityId: image.id,
          metadata: {
            objectKey: parsedRequest.data.objectKey,
            mimeType: parsedRequest.data.mimeType,
            sizeBytes: parsedRequest.data.sizeBytes,
            tagIds: finalTagIds
          }
        },
        tx
      );

      return image;
    });

    return NextResponse.json({
      image: {
        id: result.id,
        objectKey: result.objectKey,
        filename: result.filename,
        width: result.width,
        height: result.height,
        tags: result.tags.map(({ tag }) => ({
          id: tag.id,
          name: tag.name,
          slug: tag.slug
        }))
      }
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

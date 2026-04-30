import type { User } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { writeAuditLog } from "@/lib/audit";
import { db } from "@/lib/db";
import { normalizeExif } from "@/lib/images/exif";
import { normalizeTagName, slugifyTagName } from "@/lib/tags";

export const INVALID_TAGS = "所选标签中存在无效项。";

export type PersistUploadedImageInput = {
  objectKey: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  width?: number;
  height?: number;
  description?: string;
  exif?: unknown;
  tagIds?: string[];
  tagNames?: string[];
  uploadItemId?: string;
};

export async function persistUploadedImage(input: PersistUploadedImageInput, user: User) {
  const tagIds = Array.from(new Set(input.tagIds?.map((value) => value.trim()).filter(Boolean) ?? []));
  const tagNames = Array.from(new Set(input.tagNames?.map((value) => value.trim()).filter(Boolean) ?? []))
    .map(normalizeTagName);
  const normalizedExif = normalizeExif(input.exif);
  const imageWidth = input.width ?? normalizedExif?.width ?? undefined;
  const imageHeight = input.height ?? normalizedExif?.height ?? undefined;

  return db.$transaction(async (tx) => {
    const existingTags = tagIds.length
      ? await tx.tag.findMany({
          where: {
            creatorId: user.id,
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
          where: { creatorId_slug: { creatorId: user.id, slug: slugifyTagName(name) } },
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
        objectKey: input.objectKey,
        filename: input.filename,
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes,
        width: imageWidth,
        height: imageHeight,
        description: input.description || null,
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

    if (input.uploadItemId) {
      await tx.uploadItem.updateMany({
        where: {
          id: input.uploadItemId,
          session: {
            creatorId: user.id
          }
        },
        data: {
          imageId: image.id,
          objectKey: input.objectKey,
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
          objectKey: input.objectKey,
          mimeType: input.mimeType,
          sizeBytes: input.sizeBytes,
          tagIds: finalTagIds
        }
      },
      tx
    );

    return image;
  }).catch((error) => {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      throw error;
    }

    throw error;
  });
}

export function serializeUploadedImage(
  image: Awaited<ReturnType<typeof persistUploadedImage>>
) {
  return {
    id: image.id,
    objectKey: image.objectKey,
    filename: image.filename,
    width: image.width,
    height: image.height,
    tags: image.tags.map(({ tag }) => ({
      id: tag.id,
      name: tag.name,
      slug: tag.slug
    }))
  };
}

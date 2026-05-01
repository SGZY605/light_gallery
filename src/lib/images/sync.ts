import type { User } from "@prisma/client";
import { writeAuditLog } from "@/lib/audit";
import { db } from "@/lib/db";
import { deleteMetadataSidecar } from "@/lib/images/metadata-sync";
import type { SyncProgress } from "@/lib/images/sync-progress";
import { deleteOssObject, headOssObject, listOssObjects, type OssListedObject } from "@/lib/oss/client";
import { resolveUserOssConfig, type ResolvedOssConfig } from "@/lib/oss/user-config";

export type ImageOssSyncResult = {
  deletedLocalRecords: number;
  importedOssObjects: number;
  restoredLocalRecords: number;
};

export type DeleteOwnedImageResult = {
  deleted: boolean;
};

type LocalImageRecord = {
  deletedAt: Date | null;
  id: string;
  objectKey: string;
};

type ImageWithObjectKey = {
  id: string;
  objectKey: string;
};

const IMAGE_EXTENSION_MIME_TYPES: Record<string, string> = {
  avif: "image/avif",
  gif: "image/gif",
  heic: "image/heic",
  heif: "image/heif",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  png: "image/png",
  tif: "image/tiff",
  tiff: "image/tiff",
  webp: "image/webp"
};

function getFilenameFromObjectKey(objectKey: string): string {
  const filename = objectKey.split("/").filter(Boolean).at(-1)?.trim();
  return filename || objectKey;
}

function getMimeTypeFromObjectKey(objectKey: string): string {
  const extension = getFilenameFromObjectKey(objectKey).split(".").at(-1)?.toLowerCase() ?? "";
  return IMAGE_EXTENSION_MIME_TYPES[extension] ?? "image/*";
}

function isAllowedImageObject(object: OssListedObject, allowedMimePrefix: string): boolean {
  if (object.size <= 0) {
    return false;
  }

  const mimeType = getMimeTypeFromObjectKey(object.key);
  return mimeType.startsWith(allowedMimePrefix) || mimeType === "image/*";
}

async function writeImageSyncAuditLog(userId: string, result: ImageOssSyncResult) {
  await writeAuditLog({
    actorId: userId,
    action: "IMAGE_UPDATED",
    entityType: "image",
    metadata: {
      operation: "oss_sync",
      ...result
    }
  });
}

export async function syncUserImagesWithOss(
  user: User,
  onProgress?: (progress: SyncProgress) => void
): Promise<ImageOssSyncResult> {
  const config = await resolveUserOssConfig({ user });

  if (!config) {
    throw new Error("oss_config_required");
  }

  onProgress?.({
    message: "正在扫描本地图片记录和云端 OSS 对象...",
    percent: 0,
    phase: "file"
  });

  const [localImages, ossObjects] = await Promise.all([
    db.image.findMany({
      where: {
        uploaderId: user.id
      },
      select: {
        deletedAt: true,
        id: true,
        objectKey: true
      }
    }) as Promise<LocalImageRecord[]>,
    listOssObjects(config, config.uploadPrefix)
  ]);
  const ossObjectByKey = new Map(ossObjects.map((object) => [object.key, object]));
  const localImageByKey = new Map(localImages.map((image) => [image.objectKey, image]));
  const activeLocalOnlyIds = localImages
    .filter((image) => image.deletedAt === null && !ossObjectByKey.has(image.objectKey))
    .map((image) => image.id);
  const restorableLocalImages = localImages.filter(
    (image) => image.deletedAt !== null && ossObjectByKey.has(image.objectKey)
  );
  const importableOssObjects = ossObjects.filter(
    (object) => !localImageByKey.has(object.key) && isAllowedImageObject(object, config.allowedMimePrefix)
  );
  const now = new Date();

  onProgress?.({
    message: `扫描完成：本地 ${localImages.length} 张，云端 ${ossObjects.length} 张。正在比对差异...`,
    percent: 10,
    phase: "file"
  });

  let deletedLocalRecords = 0;
  if (activeLocalOnlyIds.length > 0) {
    const result = await db.image.updateMany({
      where: {
        id: {
          in: activeLocalOnlyIds
        },
        uploaderId: user.id
      },
      data: {
        deletedAt: now
      }
    });
    deletedLocalRecords = result.count;
  }

  onProgress?.({
    deleted: deletedLocalRecords,
    message: deletedLocalRecords > 0
      ? `已删除 ${deletedLocalRecords} 条本地孤立记录（云端不存在对应的图片文件）。`
      : "无需删除本地孤立记录。",
    percent: 30,
    phase: "file"
  });

  let restoredLocalRecords = 0;
  for (const image of restorableLocalImages) {
    const object = ossObjectByKey.get(image.objectKey);

    await db.image.update({
      where: {
        id: image.id
      },
      data: {
        deletedAt: null,
        ...(object ? { sizeBytes: object.size } : {})
      }
    });
    restoredLocalRecords += 1;
  }

  onProgress?.({
    deleted: deletedLocalRecords,
    message: restoredLocalRecords > 0
      ? `已恢复 ${restoredLocalRecords} 条之前删除但云端仍存在的图片记录。`
      : "无需恢复已删除的记录。",
    percent: 50,
    phase: "file",
    restored: restoredLocalRecords
  });

  let importedOssObjects = 0;
  for (const object of importableOssObjects) {
    onProgress?.({
      deleted: deletedLocalRecords,
      imported: importedOssObjects,
      message: `正在从云端导入图片 (${importedOssObjects + 1}/${importableOssObjects.length})：${getFilenameFromObjectKey(object.key)}`,
      percent: 50 + Math.round(((importedOssObjects + 1) / importableOssObjects.length) * 40),
      phase: "file",
      restored: restoredLocalRecords
    });

    await db.image.create({
      data: {
        createdAt: object.lastModified ?? now,
        filename: getFilenameFromObjectKey(object.key),
        mimeType: getMimeTypeFromObjectKey(object.key),
        objectKey: object.key,
        sizeBytes: object.size,
        uploaderId: user.id
      }
    });
    importedOssObjects += 1;
  }

  onProgress?.({
    deleted: deletedLocalRecords,
    imported: importedOssObjects,
    message: `图片文件同步完成：删除 ${deletedLocalRecords}，恢复 ${restoredLocalRecords}，导入 ${importedOssObjects}。`,
    percent: 95,
    phase: "file",
    restored: restoredLocalRecords
  });

  const result = {
    deletedLocalRecords,
    importedOssObjects,
    restoredLocalRecords
  };

  await writeImageSyncAuditLog(user.id, result);

  return result;
}

export async function filterImagesExistingInOss<TImage extends ImageWithObjectKey>({
  config,
  images,
  userId
}: {
  config: ResolvedOssConfig;
  images: TImage[];
  userId: string;
}): Promise<TImage[]> {
  if (images.length === 0) {
    return images;
  }

  const checks = await Promise.all(
    images.map(async (image) => ({
      exists: await headOssObject(config, image.objectKey),
      image
    }))
  );
  const missingImageIds = checks
    .filter(({ exists }) => !exists)
    .map(({ image }) => image.id);

  if (missingImageIds.length > 0) {
    await db.image.updateMany({
      where: {
        id: {
          in: missingImageIds
        },
        uploaderId: userId
      },
      data: {
        deletedAt: new Date()
      }
    });
  }

  return checks.filter(({ exists }) => exists).map(({ image }) => image);
}

export async function deleteOwnedImageEverywhere({
  imageId,
  user
}: {
  imageId: string;
  user: User;
}): Promise<DeleteOwnedImageResult> {
  const config = await resolveUserOssConfig({ user });

  if (!config) {
    throw new Error("oss_config_required");
  }

  const image = await db.image.findFirst({
    where: {
      id: imageId,
      deletedAt: null,
      uploaderId: user.id
    },
    select: {
      id: true,
      objectKey: true
    }
  });

  if (!image) {
    return { deleted: false };
  }

  await deleteOssObject(config, image.objectKey);
  await deleteMetadataSidecar(config, image.objectKey).catch(() => {
    // Sidecar may not exist; ignore cleanup failure
  });
  await db.image.update({
    where: {
      id: image.id
    },
    data: {
      deletedAt: new Date()
    }
  });
  await writeAuditLog({
    actorId: user.id,
    action: "IMAGE_DELETED",
    entityType: "image",
    entityId: image.id,
    metadata: {
      objectKey: image.objectKey,
      operation: "delete_image_everywhere"
    }
  });

  return { deleted: true };
}

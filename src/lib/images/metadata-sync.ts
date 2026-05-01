import type { Prisma, User } from "@prisma/client";
import { writeAuditLog } from "@/lib/audit";
import { db } from "@/lib/db";
import { deleteOssObject, getOssObject, putOssObject } from "@/lib/oss/client";
import type { SyncProgress } from "@/lib/images/sync-progress";
import { resolveUserOssConfig } from "@/lib/oss/user-config";
import { normalizeTagName, slugifyTagName } from "@/lib/tags";

type ExifMetadata = {
  cameraMake: string | null;
  cameraModel: string | null;
  exposureTime: string | null;
  fNumber: number | null;
  focalLength: number | null;
  height: number | null;
  iso: number | null;
  latitude: number | null;
  lensModel: string | null;
  longitude: number | null;
  orientation: number | null;
  raw: Prisma.JsonValue | null;
  takenAt: string | null;
  width: number | null;
};

type ImageMetadataJson = {
  description: string | null;
  exif: ExifMetadata | null;
  featured: boolean;
  height: number | null;
  location: {
    label: string | null;
    latitude: number;
    longitude: number;
  } | null;
  objectKey: string;
  syncedAt: string;
  tags: string[];
  width: number | null;
};

export type MetadataSyncResult = {
  exportedCount: number;
  importedCount: number;
  mergedCount: number;
  skippedDeletedCount: number;
};

type LocalImageWithMetadata = {
  createdAt: Date;
  deletedAt: Date | null;
  description: string | null;
  exif: {
    cameraMake: string | null;
    cameraModel: string | null;
    exposureTime: string | null;
    fNumber: number | null;
    focalLength: number | null;
    height: number | null;
    iso: number | null;
    latitude: number | null;
    lensModel: string | null;
    longitude: number | null;
    orientation: number | null;
    raw: Prisma.JsonValue | null;
    takenAt: Date | null;
    width: number | null;
  } | null;
  featured: boolean;
  height: number | null;
  id: string;
  location: {
    label: string | null;
    latitude: number;
    longitude: number;
  } | null;
  objectKey: string;
  tags: { tag: { name: string } }[];
  updatedAt: Date;
  width: number | null;
};

export function buildMetadataOssKey(metadataPrefix: string, objectKey: string): string {
  return `${metadataPrefix}/${objectKey}.json`;
}

function buildExifJson(exif: LocalImageWithMetadata["exif"]): ExifMetadata | null {
  if (!exif) {
    return null;
  }

  return {
    cameraMake: exif.cameraMake,
    cameraModel: exif.cameraModel,
    exposureTime: exif.exposureTime,
    fNumber: exif.fNumber,
    focalLength: exif.focalLength,
    height: exif.height,
    iso: exif.iso,
    latitude: exif.latitude,
    lensModel: exif.lensModel,
    longitude: exif.longitude,
    orientation: exif.orientation,
    raw: exif.raw,
    takenAt: exif.takenAt?.toISOString() ?? null,
    width: exif.width
  };
}

function buildMetadataJson(image: LocalImageWithMetadata): ImageMetadataJson {
  return {
    description: image.description,
    exif: buildExifJson(image.exif),
    featured: image.featured,
    height: image.height,
    location: image.location,
    objectKey: image.objectKey,
    syncedAt: new Date().toISOString(),
    tags: image.tags.map((t) => t.tag.name),
    width: image.width
  };
}

function mergeJsonObjects(
  local: Prisma.JsonValue | null,
  oss: Prisma.JsonValue | null
): Prisma.JsonValue | null {
  if (
    local &&
    typeof local === "object" &&
    !Array.isArray(local) &&
    oss &&
    typeof oss === "object" &&
    !Array.isArray(oss)
  ) {
    return {
      ...(oss as Prisma.JsonObject),
      ...(local as Prisma.JsonObject)
    };
  }

  return local ?? oss;
}

function mergeExifForExport(
  local: ExifMetadata | null,
  oss: ExifMetadata | null
): ExifMetadata | null {
  if (!local && !oss) {
    return null;
  }

  if (!local) {
    return oss;
  }

  if (!oss) {
    return local;
  }

  return {
    cameraMake: local.cameraMake ?? oss.cameraMake,
    cameraModel: local.cameraModel ?? oss.cameraModel,
    exposureTime: local.exposureTime ?? oss.exposureTime,
    fNumber: local.fNumber ?? oss.fNumber,
    focalLength: local.focalLength ?? oss.focalLength,
    height: local.height ?? oss.height,
    iso: local.iso ?? oss.iso,
    latitude: local.latitude ?? oss.latitude,
    lensModel: local.lensModel ?? oss.lensModel,
    longitude: local.longitude ?? oss.longitude,
    orientation: local.orientation ?? oss.orientation,
    raw: mergeJsonObjects(local.raw, oss.raw),
    takenAt: local.takenAt ?? oss.takenAt,
    width: local.width ?? oss.width
  };
}

function mergeMetadataForExport(
  local: ImageMetadataJson,
  oss: ImageMetadataJson
): ImageMetadataJson {
  return {
    // description: prefer local, fallback to OSS
    description: local.description ?? oss.description,
    // exif: field-level union, prefer local when both sides have a value
    exif: mergeExifForExport(local.exif, oss.exif),
    // featured: true wins (either side)
    featured: local.featured || oss.featured,
    // dimensions: prefer local, fallback to OSS
    height: local.height ?? oss.height,
    // location: prefer local, fallback to OSS
    location: local.location ?? oss.location,
    objectKey: local.objectKey,
    syncedAt: new Date().toISOString(),
    // tags: union
    tags: [...new Set([...local.tags, ...oss.tags])],
    width: local.width ?? oss.width
  };
}

function buildComparableMetadataJson(metadata: ImageMetadataJson) {
  return {
    description: metadata.description,
    exif: metadata.exif,
    featured: metadata.featured,
    height: metadata.height,
    location: metadata.location,
    objectKey: metadata.objectKey,
    tags: metadata.tags,
    width: metadata.width
  };
}

type MergedImportData = {
  description: string | null;
  exifCreateData: ExifMetadata | null;
  exifUpdateData: Prisma.ImageExifUpdateInput;
  featured: boolean;
  height: number | null;
  location: ImageMetadataJson["location"];
  shouldUpdateDescription: boolean;
  shouldUpdateDimensions: boolean;
  shouldUpdateExif: boolean;
  shouldUpdateFeatured: boolean;
  shouldUpdateLocation: boolean;
  tagNames: string[];
  width: number | null;
};

function mergeMetadataForImport(
  image: LocalImageWithMetadata,
  oss: ImageMetadataJson
): MergedImportData {
  const result: MergedImportData = {
    description: image.description,
    exifCreateData: null,
    exifUpdateData: {},
    featured: image.featured,
    height: image.height,
    location: image.location,
    shouldUpdateDescription: false,
    shouldUpdateDimensions: false,
    shouldUpdateExif: false,
    shouldUpdateFeatured: false,
    shouldUpdateLocation: false,
    tagNames: image.tags.map((t) => t.tag.name),
    width: image.width
  };

  // description: import if local is null/empty and OSS has value
  if (!image.description && oss.description) {
    result.description = oss.description;
    result.shouldUpdateDescription = true;
  }

  // featured: import if OSS is true and local is false
  if (!image.featured && oss.featured) {
    result.featured = true;
    result.shouldUpdateFeatured = true;
  }

  // location: import if local is null and OSS has value
  if (!image.location && oss.location) {
    result.location = oss.location;
    result.shouldUpdateLocation = true;
  }

  // tags: union merge - combine both sets
  const ossTagSet = new Set(oss.tags.map(normalizeTagName).filter(Boolean));
  const localTagSet = new Set(result.tagNames);
  const mergedTags = new Set([...localTagSet, ...ossTagSet]);
  result.tagNames = [...mergedTags];

  // exif: field-level union, only import fields missing locally
  if (!image.exif && oss.exif) {
    result.exifCreateData = oss.exif;
    result.shouldUpdateExif = true;
  } else if (image.exif && oss.exif) {
    const exifUpdates: Prisma.ImageExifUpdateInput = {};

    if (image.exif.cameraMake === null && oss.exif.cameraMake !== null) {
      exifUpdates.cameraMake = oss.exif.cameraMake;
    }
    if (image.exif.cameraModel === null && oss.exif.cameraModel !== null) {
      exifUpdates.cameraModel = oss.exif.cameraModel;
    }
    if (image.exif.exposureTime === null && oss.exif.exposureTime !== null) {
      exifUpdates.exposureTime = oss.exif.exposureTime;
    }
    if (image.exif.fNumber === null && oss.exif.fNumber !== null) {
      exifUpdates.fNumber = oss.exif.fNumber;
    }
    if (image.exif.focalLength === null && oss.exif.focalLength !== null) {
      exifUpdates.focalLength = oss.exif.focalLength;
    }
    if (image.exif.height === null && oss.exif.height !== null) {
      exifUpdates.height = oss.exif.height;
    }
    if (image.exif.iso === null && oss.exif.iso !== null) {
      exifUpdates.iso = oss.exif.iso;
    }
    if (image.exif.latitude === null && oss.exif.latitude !== null) {
      exifUpdates.latitude = oss.exif.latitude;
    }
    if (image.exif.lensModel === null && oss.exif.lensModel !== null) {
      exifUpdates.lensModel = oss.exif.lensModel;
    }
    if (image.exif.longitude === null && oss.exif.longitude !== null) {
      exifUpdates.longitude = oss.exif.longitude;
    }
    if (image.exif.orientation === null && oss.exif.orientation !== null) {
      exifUpdates.orientation = oss.exif.orientation;
    }
    if (image.exif.takenAt === null && oss.exif.takenAt !== null) {
      exifUpdates.takenAt = new Date(oss.exif.takenAt);
    }
    if (image.exif.width === null && oss.exif.width !== null) {
      exifUpdates.width = oss.exif.width;
    }

    const mergedRaw = mergeJsonObjects(image.exif.raw, oss.exif.raw);
    if (mergedRaw !== null && JSON.stringify(mergedRaw) !== JSON.stringify(image.exif.raw)) {
      exifUpdates.raw = mergedRaw;
    }

    if (Object.keys(exifUpdates).length > 0) {
      result.exifUpdateData = exifUpdates;
      result.shouldUpdateExif = true;
    }
  }

  // dimensions: import if local is null and OSS has value
  if (image.width === null && oss.width !== null) {
    result.width = oss.width;
    result.shouldUpdateDimensions = true;
  }
  if (image.height === null && oss.height !== null) {
    result.height = oss.height;
    result.shouldUpdateDimensions = true;
  }

  return result;
}

async function importMetadataToLocal(
  user: User,
  image: LocalImageWithMetadata,
  metadata: ImageMetadataJson
): Promise<void> {
  const merged = mergeMetadataForImport(image, metadata);

  await db.$transaction(async (tx) => {
    const tagRecords: Array<{ id: string }> = [];
    const reservedSlugs = new Set<string>();

    for (const tagName of merged.tagNames) {
      const existingByName = await tx.tag.findUnique({
        where: {
          creatorId_name: {
            creatorId: user.id,
            name: tagName
          }
        }
      });

      if (existingByName) {
        tagRecords.push(existingByName);
        reservedSlugs.add(existingByName.slug);
        continue;
      }

      const baseSlug = slugifyTagName(tagName);
      let slug = baseSlug;
      let suffix = 2;

      while (
        reservedSlugs.has(slug) ||
        (await tx.tag.findUnique({
          where: {
            creatorId_slug: {
              creatorId: user.id,
              slug
            }
          }
        }))
      ) {
        reservedSlugs.add(slug);
        slug = `${baseSlug}-${suffix}`;
        suffix += 1;
      }

      reservedSlugs.add(slug);
      tagRecords.push(
        await tx.tag.create({
          data: {
            creatorId: user.id,
            name: tagName,
            slug
          }
        })
      );
    }

    // Update tags
    await tx.imageTag.deleteMany({
      where: { imageId: image.id }
    });

    if (tagRecords.length > 0) {
      await tx.imageTag.createMany({
        data: tagRecords.map((tag) => ({
          imageId: image.id,
          tagId: tag.id
        })),
        skipDuplicates: true
      });
    }

    // Update location
    if (merged.shouldUpdateLocation && merged.location) {
      await tx.imageLocationOverride.upsert({
        create: {
          imageId: image.id,
          label: merged.location.label,
          latitude: merged.location.latitude,
          longitude: merged.location.longitude,
          source: "manual",
          updatedById: user.id
        },
        update: {
          label: merged.location.label,
          latitude: merged.location.latitude,
          longitude: merged.location.longitude
        },
        where: { imageId: image.id }
      });
    }

    // Update description and featured on the Image record
    if (merged.shouldUpdateDescription || merged.shouldUpdateFeatured) {
      await tx.image.update({
        where: { id: image.id },
        data: {
          ...(merged.shouldUpdateDescription ? { description: merged.description } : {}),
          ...(merged.shouldUpdateFeatured ? { featured: merged.featured } : {})
        }
      });
    }

    // Update dimensions
    if (merged.shouldUpdateDimensions) {
      await tx.image.update({
        where: { id: image.id },
        data: {
          height: merged.height,
          width: merged.width
        }
      });
    }

    // Import missing EXIF data without overwriting local values.
    if (merged.shouldUpdateExif) {
      const exif = merged.exifCreateData ?? metadata.exif;

      if (!exif) {
        return;
      }
      await tx.imageExif.upsert({
        create: {
          cameraMake: exif.cameraMake,
          cameraModel: exif.cameraModel,
          exposureTime: exif.exposureTime,
          fNumber: exif.fNumber,
          focalLength: exif.focalLength,
          height: exif.height,
          imageId: image.id,
          iso: exif.iso,
          latitude: exif.latitude,
          lensModel: exif.lensModel,
          longitude: exif.longitude,
          orientation: exif.orientation,
          raw: exif.raw ?? {},
          takenAt: exif.takenAt ? new Date(exif.takenAt) : null,
          width: exif.width
        },
        update: merged.exifUpdateData,
        where: { imageId: image.id }
      });
    }
  });
}

export async function deleteMetadataSidecar(
  config: { metadataPrefix: string } & Parameters<typeof deleteOssObject>[0],
  objectKey: string
): Promise<void> {
  const sidecarKey = buildMetadataOssKey(config.metadataPrefix, objectKey);
  await deleteOssObject(config, sidecarKey);
}

export async function syncUserMetadataWithOss(
  user: User,
  onProgress?: (progress: SyncProgress) => void
): Promise<MetadataSyncResult> {
  const config = await resolveUserOssConfig({ user });

  if (!config) {
    throw new Error("oss_config_required");
  }

  const images = (await db.image.findMany({
    where: {
      uploaderId: user.id
    },
    include: {
      exif: true,
      location: true,
      tags: {
        include: {
          tag: true
        }
      }
    }
  })) as unknown as LocalImageWithMetadata[];

  const activeImages = images.filter((img) => img.deletedAt === null);
  const skippedDeletedCount = images.length - activeImages.length;

  onProgress?.({
    message: `正在同步元数据：共 ${activeImages.length} 张活跃图片，${skippedDeletedCount} 张已跳过（已删除）。`,
    percent: 0,
    phase: "metadata"
  });

  let exportedCount = 0;
  let importedCount = 0;
  let mergedCount = 0;
  let processed = 0;

  for (const image of activeImages) {
    processed += 1;
    const percent = Math.round((processed / activeImages.length) * 100);
    const filename = image.objectKey.split("/").filter(Boolean).at(-1) ?? image.objectKey;

    onProgress?.({
      exported: exportedCount,
      imported: importedCount,
      merged: mergedCount,
      message: `正在同步元数据 (${processed}/${activeImages.length})：${filename}`,
      percent,
      phase: "metadata"
    });

    const ossKey = buildMetadataOssKey(config.metadataPrefix, image.objectKey);
    const ossJson = await getOssObject(config, ossKey);
    const ossMetadata: ImageMetadataJson | null = ossJson ? JSON.parse(ossJson) : null;
    const localJson = buildMetadataJson(image);

    if (!ossMetadata) {
      // No OSS sidecar - export local metadata to OSS
      await putOssObject(config, ossKey, JSON.stringify(localJson));
      exportedCount += 1;
      continue;
    }

    const ossSyncedAt = new Date(ossMetadata.syncedAt);
    const localUpdatedAt = image.updatedAt;

    // Always build a fully merged result from both sides
    const mergedJson = mergeMetadataForExport(localJson, ossMetadata);
    const localNeedsImport = mergeMetadataForImport(image, mergedJson);
    const hasLocalGaps =
      localNeedsImport.shouldUpdateDescription ||
      localNeedsImport.shouldUpdateFeatured ||
      localNeedsImport.shouldUpdateLocation ||
      localNeedsImport.shouldUpdateExif ||
      localNeedsImport.shouldUpdateDimensions ||
      localNeedsImport.tagNames.length !== image.tags.length;
    const hasOssGaps =
      JSON.stringify(buildComparableMetadataJson(mergedJson)) !==
      JSON.stringify(buildComparableMetadataJson(ossMetadata));

    if (localUpdatedAt > ossSyncedAt) {
      // Local is newer - write merged result to OSS (preserves OSS-only fields)
      if (hasLocalGaps) {
        await importMetadataToLocal(user, image, mergedJson);
      }
      if (hasOssGaps) {
        await putOssObject(config, ossKey, JSON.stringify(mergedJson));
      }
      exportedCount += 1;
    } else if (ossSyncedAt > localUpdatedAt) {
      // OSS is newer - import merged result to local, also backfill OSS
      if (hasLocalGaps) {
        await importMetadataToLocal(user, image, mergedJson);
      }
      if (hasOssGaps) {
        await putOssObject(config, ossKey, JSON.stringify(mergedJson));
      }
      importedCount += 1;
    } else {
      // Timestamps equal - only act if there are gaps on either side
      if (hasLocalGaps || hasOssGaps) {
        if (hasLocalGaps) {
          await importMetadataToLocal(user, image, mergedJson);
        }
        if (hasOssGaps) {
          await putOssObject(config, ossKey, JSON.stringify(mergedJson));
        }
        mergedCount += 1;
      }
    }
  }

  onProgress?.({
    exported: exportedCount,
    imported: importedCount,
    merged: mergedCount,
    message: `元数据同步完成：导出 ${exportedCount}，导入 ${importedCount}，合并 ${mergedCount}，跳过 ${skippedDeletedCount}。`,
    percent: 100,
    phase: "metadata"
  });

  await writeAuditLog({
    actorId: user.id,
    action: "IMAGE_UPDATED",
    entityType: "image",
    metadata: {
      exportedCount,
      importedCount,
      mergedCount,
      operation: "metadata_sync",
      skippedDeletedCount
    }
  });

  return {
    exportedCount,
    importedCount,
    mergedCount,
    skippedDeletedCount
  };
}

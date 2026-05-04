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
  filename: string | null;
  height: number | null;
  location: {
    label: string | null;
    latitude: number;
    longitude: number;
  } | null;
  mimeType: string | null;
  objectKey: string;
  sizeBytes: number | null;
  syncedAt: string;
  tags: string[];
  width: number | null;
};

export type MetadataSyncResult = {
  exportedCount: number;
  importedCount: number;
  mergedCount: number;
  skippedDeletedCount: number;
  syncedTagsCount: number;
};

type TagsMetadataJson = {
  tags: Array<{ color: string | null; name: string }>;
  syncedAt: string;
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
  filename: string;
  height: number | null;
  id: string;
  location: {
    label: string | null;
    latitude: number;
    longitude: number;
  } | null;
  mimeType: string;
  objectKey: string;
  sizeBytes: number;
  tags: { tag: { name: string } }[];
  updatedAt: Date;
  width: number | null;
};

export function buildMetadataOssKey(metadataPrefix: string, objectKey: string): string {
  return `${metadataPrefix}/${objectKey}.json`;
}

export function buildTagsOssKey(metadataPrefix: string): string {
  return `${metadataPrefix}/tags.json`;
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
    filename: image.filename,
    height: image.height,
    location: image.location,
    mimeType: image.mimeType,
    objectKey: image.objectKey,
    sizeBytes: image.sizeBytes,
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
    // filename: prefer local, fallback to OSS.
    // Note: resolveFilenameForSync is applied AFTER this merge to handle timestamp-based priority.
    filename: local.filename ?? oss.filename,
    // dimensions: prefer local, fallback to OSS
    height: local.height ?? oss.height,
    // location: prefer local, fallback to OSS
    location: local.location ?? oss.location,
    // mimeType: prefer local, fallback to OSS
    mimeType: local.mimeType ?? oss.mimeType,
    objectKey: local.objectKey,
    // sizeBytes: prefer local, fallback to OSS
    sizeBytes: local.sizeBytes ?? oss.sizeBytes,
    syncedAt: new Date().toISOString(),
    // tags: union
    tags: [...new Set([...local.tags, ...oss.tags])],
    width: local.width ?? oss.width
  };
}

/**
 * 解决文件名同步冲突：用户手动命名的名称优先级最高。
 *
 * 策略：
 * 1. OSS 没有文件名 → 保留本地文件名
 * 2. 两侧文件名相同 → 无冲突
 * 3. OSS 有用户自定义名称，且 OSS 元数据更新时间晚于本地图片更新时间
 *    → 使用 OSS 的用户自定义名称（其他用户重命名了）
 * 4. 本地更新时间更晚 → 保留本地文件名（当前用户重命名了）
 * 5. 时间相同 → 保留本地文件名
 */
function resolveFilenameForSync(args: {
  localFilename: string;
  localUpdatedAt: Date;
  ossFilename: string | null;
  ossSyncedAt: string;
}): string {
  const { localFilename, localUpdatedAt, ossFilename, ossSyncedAt } = args;

  // OSS 没有文件名记录 → 保留本地
  if (!ossFilename) {
    return localFilename;
  }

  // 两侧文件名相同 → 无冲突
  if (ossFilename === localFilename) {
    return localFilename;
  }

  // 两侧文件名不同 → 用时间戳决定谁更新
  const ossDate = new Date(ossSyncedAt);
  if (ossDate > localUpdatedAt) {
    // OSS 元数据更新时间更晚 → 其他用户最近重命名了，使用 OSS 的名称
    return ossFilename;
  }

  // 本地更新时间更晚或相同 → 保留本地文件名
  return localFilename;
}

function buildComparableMetadataJson(metadata: ImageMetadataJson) {
  return {
    description: metadata.description,
    exif: metadata.exif,
    featured: metadata.featured,
    filename: metadata.filename,
    height: metadata.height,
    location: metadata.location,
    mimeType: metadata.mimeType,
    objectKey: metadata.objectKey,
    sizeBytes: metadata.sizeBytes,
    tags: metadata.tags,
    width: metadata.width
  };
}

type MergedImportData = {
  description: string | null;
  exifCreateData: ExifMetadata | null;
  exifUpdateData: Prisma.ImageExifUpdateInput;
  featured: boolean;
  filename: string | null;
  height: number | null;
  location: ImageMetadataJson["location"];
  mimeType: string | null;
  shouldUpdateDescription: boolean;
  shouldUpdateDimensions: boolean;
  shouldUpdateExif: boolean;
  shouldUpdateFeatured: boolean;
  shouldUpdateFilename: boolean;
  shouldUpdateLocation: boolean;
  shouldUpdateMimeType: boolean;
  shouldUpdateSizeBytes: boolean;
  sizeBytes: number | null;
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
    filename: image.filename,
    height: image.height,
    location: image.location,
    mimeType: image.mimeType,
    shouldUpdateDescription: false,
    shouldUpdateDimensions: false,
    shouldUpdateExif: false,
    shouldUpdateFeatured: false,
    shouldUpdateFilename: false,
    shouldUpdateLocation: false,
    shouldUpdateMimeType: false,
    shouldUpdateSizeBytes: false,
    sizeBytes: image.sizeBytes,
    tagNames: image.tags.map((t) => t.tag.name),
    width: image.width
  };

  // filename: import if resolved filename differs from local.
  // resolved filename is determined by resolveFilenameForSync (timestamp-based priority).
  if (oss.filename && oss.filename !== image.filename) {
    result.filename = oss.filename;
    result.shouldUpdateFilename = true;
  }

  // mimeType: import if OSS has value and local is different
  if (oss.mimeType && oss.mimeType !== image.mimeType) {
    result.mimeType = oss.mimeType;
    result.shouldUpdateMimeType = true;
  }

  // sizeBytes: import if OSS has value and local is different
  if (oss.sizeBytes && oss.sizeBytes !== image.sizeBytes) {
    result.sizeBytes = oss.sizeBytes;
    result.shouldUpdateSizeBytes = true;
  }

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

    // Update filename if changed
    if (merged.shouldUpdateFilename && merged.filename) {
      await tx.image.update({
        where: { id: image.id },
        data: { filename: merged.filename }
      });
    }

    // Update mimeType if changed
    if (merged.shouldUpdateMimeType && merged.mimeType) {
      await tx.image.update({
        where: { id: image.id },
        data: { mimeType: merged.mimeType }
      });
    }

    // Update sizeBytes if changed
    if (merged.shouldUpdateSizeBytes && merged.sizeBytes) {
      await tx.image.update({
        where: { id: image.id },
        data: { sizeBytes: merged.sizeBytes }
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

/**
 * 同步孤立标签（没有绑定图片的标签）到 OSS。
 * 策略：本地和 OSS 的标签取并集，同步到两侧。
 */
async function syncOrphanTags(
  user: User,
  config: { metadataPrefix: string } & Parameters<typeof getOssObject>[0] & Parameters<typeof putOssObject>[0],
  onProgress?: (progress: SyncProgress) => void
): Promise<number> {
  // 获取用户所有标签
  const allTags = await db.tag.findMany({
    where: { creatorId: user.id },
    select: { color: true, name: true }
  });

  // 读取 OSS 上的标签数据
  const tagsOssKey = buildTagsOssKey(config.metadataPrefix);
  let ossTagsData: TagsMetadataJson | null = null;
  try {
    const ossJson = await getOssObject(config, tagsOssKey);
    if (ossJson) {
      const parsed = JSON.parse(ossJson);
      // 验证数据格式：必须有 tags 数组，且每个元素有 name 属性
      if (
        parsed &&
        Array.isArray(parsed.tags) &&
        parsed.tags.every((t: unknown) => t && typeof t === "object" && "name" in t)
      ) {
        ossTagsData = parsed as TagsMetadataJson;
      }
    }
  } catch {
    // OSS 上没有标签数据或解析失败
  }

  // 构建本地标签集合（以名称为 key）
  const localTagMap = new Map(allTags.map((t) => [normalizeTagName(t.name), t]));
  const ossTagMap = new Map(
    (ossTagsData?.tags ?? [])
      .filter((t) => normalizeTagName(t.name))
      .map((t) => [normalizeTagName(t.name)!, t])
  );

  // 取并集：本地 + OSS
  const mergedTagMap = new Map([...ossTagMap, ...localTagMap]);

  const mergedTags = [...mergedTagMap.values()];
  const mergedTagNames = new Set(mergedTagMap.keys());

  // 检查是否有变化
  const ossTagNames = new Set(ossTagMap.keys());
  const localTagNames = new Set(localTagMap.keys());
  const hasChanges =
    mergedTagNames.size !== ossTagNames.size ||
    mergedTagNames.size !== localTagNames.size ||
    [...mergedTagNames].some((name) => !ossTagNames.has(name) || !localTagNames.has(name));

  if (!hasChanges) {
    return 0;
  }

  // 在本地创建 OSS 上有但本地没有的标签
  const reservedSlugs = new Set(allTags.map((t) => slugifyTagName(t.name)));

  for (const ossTag of ossTagMap.values()) {
    const normalizedName = normalizeTagName(ossTag.name);
    if (!normalizedName || localTagMap.has(normalizedName)) {
      continue;
    }

    const baseSlug = slugifyTagName(ossTag.name);
    let slug = baseSlug;
    let suffix = 2;

    while (
      reservedSlugs.has(slug) ||
      (await db.tag.findUnique({
        where: {
          creatorId_slug: { creatorId: user.id ?? "", slug }
        }
      }))
    ) {
      reservedSlugs.add(slug);
      slug = `${baseSlug}-${suffix}`;
      suffix += 1;
    }

    reservedSlugs.add(slug);
    await db.tag.create({
      data: {
        color: ossTag.color,
        creatorId: user.id,
        name: ossTag.name,
        slug
      }
    });
  }

  // 将合并后的标签写回 OSS
  const tagsMetadata: TagsMetadataJson = {
    tags: mergedTags.map((t) => ({ color: t.color, name: t.name })).sort((a, b) => a.name.localeCompare(b.name)),
    syncedAt: new Date().toISOString()
  };
  await putOssObject(config, tagsOssKey, JSON.stringify(tagsMetadata));

  onProgress?.({
    message: `已同步 ${mergedTags.length} 个标签（含孤立标签）到云端。`,
    percent: 100,
    phase: "metadata"
  });

  return mergedTags.length;
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

    // 文件名同步策略：用户手动命名的名称优先级最高。
    // 用时间戳决定文件名归属：OSS 元数据更新时间更晚则用 OSS 文件名，否则保留本地文件名。
    mergedJson.filename = resolveFilenameForSync({
      localFilename: image.filename,
      localUpdatedAt,
      ossFilename: ossMetadata.filename,
      ossSyncedAt: ossMetadata.syncedAt
    });

    const localNeedsImport = mergeMetadataForImport(image, mergedJson);
    const hasLocalGaps =
      localNeedsImport.shouldUpdateDescription ||
      localNeedsImport.shouldUpdateFeatured ||
      localNeedsImport.shouldUpdateLocation ||
      localNeedsImport.shouldUpdateExif ||
      localNeedsImport.shouldUpdateDimensions ||
      localNeedsImport.shouldUpdateFilename ||
      localNeedsImport.shouldUpdateMimeType ||
      localNeedsImport.shouldUpdateSizeBytes ||
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
    message: `图片元数据同步完成：导出 ${exportedCount}，导入 ${importedCount}，合并 ${mergedCount}，跳过 ${skippedDeletedCount}。`,
    percent: 90,
    phase: "metadata"
  });

  // 同步孤立标签（没有绑定图片的标签）
  const syncedTagsCount = await syncOrphanTags(user, config, onProgress);

  onProgress?.({
    exported: exportedCount,
    imported: importedCount,
    merged: mergedCount,
    message: `元数据同步完成：导出 ${exportedCount}，导入 ${importedCount}，合并 ${mergedCount}，跳过 ${skippedDeletedCount}，标签 ${syncedTagsCount} 个。`,
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
      skippedDeletedCount,
      syncedTagsCount
    }
  });

  return {
    exportedCount,
    importedCount,
    mergedCount,
    skippedDeletedCount,
    syncedTagsCount
  };
}

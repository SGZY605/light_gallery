import { NextResponse } from "next/server";
import { z } from "zod";
import { writeAuditLog } from "@/lib/audit";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const updateRequestSchema = z.object({
  tagIds: z.array(z.string().min(1)),
  location: z
    .object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
      label: z.string().trim().max(120).optional()
    })
    .nullable()
});

type ImageResponseShape = {
  id: string;
  objectKey?: string;
  filename?: string;
  mimeType?: string;
  sizeBytes?: number;
  width?: number | null;
  height?: number | null;
  description?: string | null;
  createdAt?: Date;
  exif?: {
    cameraMake?: string | null;
    cameraModel?: string | null;
    lensModel?: string | null;
    focalLength?: number | null;
    fNumber?: number | null;
    exposureTime?: string | null;
    iso?: number | null;
    takenAt?: Date | null;
    width?: number | null;
    height?: number | null;
    orientation?: number | null;
    latitude?: number | null;
    longitude?: number | null;
    raw?: unknown;
  } | null;
  location?: {
    latitude: number;
    longitude: number;
    label?: string | null;
  } | null;
  tags: Array<{
    tag: {
      id: string;
      name: string;
      slug: string;
      color?: string | null;
    };
  }>;
};

function buildImageResponse(image: ImageResponseShape) {
  return {
    id: image.id,
    objectKey: image.objectKey,
    filename: image.filename,
    mimeType: image.mimeType,
    sizeBytes: image.sizeBytes,
    width: image.width,
    height: image.height,
    description: image.description,
    createdAt: image.createdAt?.toISOString(),
    exif: image.exif
      ? {
          cameraMake: image.exif.cameraMake,
          cameraModel: image.exif.cameraModel,
          lensModel: image.exif.lensModel,
          focalLength: image.exif.focalLength,
          fNumber: image.exif.fNumber,
          exposureTime: image.exif.exposureTime,
          iso: image.exif.iso,
          takenAt: image.exif.takenAt?.toISOString() ?? null,
          width: image.exif.width,
          height: image.exif.height,
          orientation: image.exif.orientation,
          latitude: image.exif.latitude,
          longitude: image.exif.longitude,
          raw: image.exif.raw
        }
      : null,
    location: image.location
      ? {
          latitude: image.location.latitude,
          longitude: image.location.longitude,
          label: image.location.label ?? null
        }
      : null,
    tags: image.tags.map(({ tag }) => ({
      id: tag.id,
      name: tag.name,
      slug: tag.slug,
      color: tag.color ?? null
    }))
  };
}

export async function GET(_request: Request, { params }: RouteContext) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "请先登录。" }, { status: 401 });
  }

  const { id } = await params;

  const image = await db.image.findFirst({
    where: {
      id,
      deletedAt: null,
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
  });

  if (!image) {
    return NextResponse.json({ error: "未找到对应图片。" }, { status: 404 });
  }

  return NextResponse.json(buildImageResponse(image));
}

export async function PUT(request: Request, { params }: RouteContext) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "请先登录。" }, { status: 401 });
  }

  const { id } = await params;
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求内容无效。" }, { status: 400 });
  }

  const parsed = updateRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "请求内容无效。" }, { status: 400 });
  }

  const image = await db.image.findFirst({
    where: {
      id,
      deletedAt: null,
      uploaderId: user.id
    },
    include: {
      tags: {
        include: {
          tag: true
        }
      },
      location: true
    }
  });

  if (!image) {
    return NextResponse.json({ error: "未找到对应图片。" }, { status: 404 });
  }

  const tagIds = Array.from(new Set(parsed.data.tagIds));

  if (tagIds.length > 0) {
    const existingTags = await db.tag.findMany({
      where: {
        creatorId: user.id,
        id: {
          in: tagIds
        }
      },
      select: {
        id: true
      }
    });

    if (existingTags.length !== tagIds.length) {
      return NextResponse.json({ error: "所选标签中存在无效项。" }, { status: 400 });
    }
  }

  await db.$transaction(async (tx) => {
    await tx.imageTag.deleteMany({
      where: {
        imageId: id,
        image: {
          uploaderId: user.id
        }
      }
    });

    if (tagIds.length > 0) {
      await tx.imageTag.createMany({
        data: tagIds.map((tagId) => ({
          imageId: id,
          tagId
        }))
      });
    }

    if (parsed.data.location) {
      await tx.imageLocationOverride.upsert({
        where: { imageId: id },
        update: {
          latitude: parsed.data.location.latitude,
          longitude: parsed.data.location.longitude,
          label: parsed.data.location.label?.trim() || null,
          source: "manual",
          updatedById: user.id
        },
        create: {
          imageId: id,
          latitude: parsed.data.location.latitude,
          longitude: parsed.data.location.longitude,
          label: parsed.data.location.label?.trim() || null,
          source: "manual",
          updatedById: user.id
        }
      });
    } else {
      await tx.imageLocationOverride.deleteMany({
        where: {
          imageId: id,
          image: {
            uploaderId: user.id
          }
        }
      });
    }

    await writeAuditLog(
      {
        actorId: user.id,
        action: "IMAGE_UPDATED",
        entityType: "image",
        entityId: id,
        metadata: {
          operation: "detail_editor_save",
          tagIds,
          location: parsed.data.location
            ? {
                latitude: parsed.data.location.latitude,
                longitude: parsed.data.location.longitude,
                label: parsed.data.location.label?.trim() || null
              }
            : null
        }
      },
      tx
    );
  });

  const updatedImage = await db.image.findFirst({
    where: {
      id,
      deletedAt: null,
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
  });

  if (!updatedImage) {
    return NextResponse.json({ error: "未找到对应图片。" }, { status: 404 });
  }

  return NextResponse.json(buildImageResponse(updatedImage));
}

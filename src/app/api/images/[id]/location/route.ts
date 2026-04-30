import { NextResponse } from "next/server";
import { z } from "zod";
import { writeAuditLog } from "@/lib/audit";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";

const requestSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  label: z.string().trim().max(120).optional()
});

const INVALID_REQUEST = "invalid_request";
const IMAGE_NOT_FOUND = "image_not_found";
const UNAUTHORIZED = "unauthorized";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

async function findOwnedImage(id: string, userId: string) {
  return db.image.findFirst({
    where: {
      id,
      deletedAt: null,
      uploaderId: userId
    },
    select: {
      id: true
    }
  });
}

export async function PUT(request: Request, { params }: RouteContext) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: UNAUTHORIZED }, { status: 401 });
  }

  const { id } = await params;
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

  const image = await findOwnedImage(id, user.id);

  if (!image) {
    return NextResponse.json({ error: IMAGE_NOT_FOUND }, { status: 404 });
  }

  const location = await db.imageLocationOverride.upsert({
    where: {
      imageId: id
    },
    update: {
      latitude: parsedRequest.data.latitude,
      longitude: parsedRequest.data.longitude,
      label: parsedRequest.data.label || null,
      source: "manual",
      updatedById: user.id
    },
    create: {
      imageId: id,
      latitude: parsedRequest.data.latitude,
      longitude: parsedRequest.data.longitude,
      label: parsedRequest.data.label || null,
      source: "manual",
      updatedById: user.id
    }
  });

  await writeAuditLog({
    actorId: user.id,
    action: "IMAGE_LOCATION_UPDATED",
    entityType: "image",
    entityId: id,
    metadata: {
      latitude: location.latitude,
      longitude: location.longitude,
      label: location.label,
      operation: "upsert"
    }
  });

  return NextResponse.json({
    location
  });
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: UNAUTHORIZED }, { status: 401 });
  }

  const { id } = await params;
  const image = await findOwnedImage(id, user.id);

  if (!image) {
    return NextResponse.json({ error: IMAGE_NOT_FOUND }, { status: 404 });
  }

  await db.imageLocationOverride.deleteMany({
    where: {
      imageId: id,
      image: {
        uploaderId: user.id
      }
    }
  });

  await writeAuditLog({
    actorId: user.id,
    action: "IMAGE_LOCATION_UPDATED",
    entityType: "image",
    entityId: id,
    metadata: {
      operation: "delete"
    }
  });

  return NextResponse.json({
    ok: true
  });
}

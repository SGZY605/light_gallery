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

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

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
    return NextResponse.json({ error: "请求内容无效，请输入正确的经纬度。" }, { status: 400 });
  }

  const parsedRequest = requestSchema.safeParse(body);

  if (!parsedRequest.success) {
    return NextResponse.json({ error: "请求内容无效，请输入正确的经纬度。" }, { status: 400 });
  }

  const image = await db.image.findUnique({
    where: {
      id
    },
    select: {
      id: true
    }
  });

  if (!image) {
    return NextResponse.json({ error: "未找到对应图片。" }, { status: 404 });
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
    return NextResponse.json({ error: "请先登录。" }, { status: 401 });
  }

  const { id } = await params;
  await db.imageLocationOverride.deleteMany({
    where: {
      imageId: id
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

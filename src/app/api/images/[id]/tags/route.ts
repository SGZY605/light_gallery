import { NextResponse } from "next/server";
import { z } from "zod";
import { writeAuditLog } from "@/lib/audit";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";

const requestSchema = z.object({
  tagIds: z.array(z.string().min(1)).min(0)
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
    return NextResponse.json({ error: "请求内容无效。" }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "请求内容无效。" }, { status: 400 });
  }

  const image = await db.image.findUnique({
    where: { id },
    select: { id: true }
  });

  if (!image) {
    return NextResponse.json({ error: "未找到对应图片。" }, { status: 404 });
  }

  const tagIds = Array.from(new Set(parsed.data.tagIds));

  if (tagIds.length > 0) {
    const existingTags = await db.tag.findMany({
      where: { id: { in: tagIds } },
      select: { id: true }
    });

    if (existingTags.length !== tagIds.length) {
      return NextResponse.json({ error: "所选标签中存在无效项。" }, { status: 400 });
    }
  }

  await db.$transaction(async (tx) => {
    await tx.imageTag.deleteMany({
      where: { imageId: id }
    });

    if (tagIds.length > 0) {
      await tx.imageTag.createMany({
        data: tagIds.map((tagId) => ({
          imageId: id,
          tagId
        }))
      });
    }

    await writeAuditLog(
      {
        actorId: user.id,
        action: "IMAGE_UPDATED",
        entityType: "image",
        entityId: id,
        metadata: {
          tagIds,
          operation: "update_tags"
        }
      },
      tx
    );
  });

  const updatedImage = await db.image.findUnique({
    where: { id },
    include: {
      tags: {
        include: { tag: true }
      }
    }
  });

  return NextResponse.json({
    tags: updatedImage!.tags.map(({ tag }) => ({
      id: tag.id,
      name: tag.name,
      slug: tag.slug,
      color: tag.color
    }))
  });
}

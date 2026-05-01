import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const favoriteRequestSchema = z.object({
  featured: z.boolean()
});

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

  const parsed = favoriteRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "请求内容无效。" }, { status: 400 });
  }

  const image = await db.image.findFirst({
    where: {
      id,
      deletedAt: null,
      uploaderId: user.id
    },
    select: {
      id: true
    }
  });

  if (!image) {
    return NextResponse.json({ error: "未找到对应图片。" }, { status: 404 });
  }

  const updatedImage = await db.image.update({
    where: {
      id
    },
    data: {
      featured: parsed.data.featured
    },
    select: {
      id: true,
      featured: true
    }
  });

  return NextResponse.json(updatedImage);
}

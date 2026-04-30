import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { createShareToken } from "@/lib/shares/tokens";

const createShareSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional(),
  tagIds: z.array(z.string().trim().min(1)).min(1).max(25),
  expiresAt: z.string().datetime().optional(),
  allowDownload: z.boolean().optional()
});

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const shares = await db.share.findMany({
    where: {
      creatorId: user.id
    },
    orderBy: {
      createdAt: "desc"
    },
    include: {
      creator: true,
      tags: {
        include: {
          tag: true
        },
        where: {
          tag: {
            creatorId: user.id
          }
        }
      }
    }
  });

  return NextResponse.json({
    shares: shares.map((share) => ({
      id: share.id,
      token: share.token,
      title: share.title,
      description: share.description,
      allowDownload: share.allowDownload,
      revoked: share.revoked,
      revokedAt: share.revokedAt,
      expiresAt: share.expiresAt,
      creator: {
        id: share.creator.id,
        name: share.creator.name
      },
      tags: share.tags.map(({ tag }) => ({
        id: tag.id,
        name: tag.name,
        slug: tag.slug
      }))
    }))
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const parsedRequest = createShareSchema.safeParse(body);

  if (!parsedRequest.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const uniqueTagIds = Array.from(new Set(parsedRequest.data.tagIds));
  const existingTags = await db.tag.findMany({
    where: {
      creatorId: user.id,
      id: {
        in: uniqueTagIds
      }
    }
  });

  if (existingTags.length !== uniqueTagIds.length) {
    return NextResponse.json({ error: "invalid_tags" }, { status: 400 });
  }

  const share = await db.share.create({
    data: {
      token: createShareToken(),
      title: parsedRequest.data.title,
      description: parsedRequest.data.description || null,
      allowDownload: parsedRequest.data.allowDownload ?? false,
      expiresAt: parsedRequest.data.expiresAt ? new Date(parsedRequest.data.expiresAt) : null,
      creatorId: user.id,
      tags: {
        create: uniqueTagIds.map((tagId) => ({
          tagId
        }))
      }
    },
    include: {
      tags: {
        include: {
          tag: true
        }
      }
    }
  });

  return NextResponse.json({
    share: {
      id: share.id,
      token: share.token,
      title: share.title,
      description: share.description,
      allowDownload: share.allowDownload,
      expiresAt: share.expiresAt,
      tags: share.tags.map(({ tag }) => ({
        id: tag.id,
        name: tag.name,
        slug: tag.slug
      }))
    }
  });
}

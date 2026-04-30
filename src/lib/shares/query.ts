import type { Prisma, ShareMatchMode } from "@prisma/client";
import { db } from "@/lib/db";

type ShareQueryClient = Pick<typeof db, "image" | "share">;

type ShareWithTagIds = {
  creatorId: string;
  id: string;
  matchMode: ShareMatchMode;
  tags: Array<{ tagId: string }>;
};

export function buildShareImageWhere(share: ShareWithTagIds): Prisma.ImageWhereInput {
  const tagIds = share.tags.map((tag) => tag.tagId);
  const ownerWhere: Prisma.ImageWhereInput = {
    deletedAt: null,
    uploaderId: share.creatorId
  };

  if (!tagIds.length) {
    return ownerWhere;
  }

  if (share.matchMode === "ANY") {
    return {
      ...ownerWhere,
      tags: {
        some: {
          tagId: {
            in: tagIds
          }
        }
      }
    };
  }

  return {
    ...ownerWhere,
    AND: tagIds.map((tagId) => ({
      tags: {
        some: {
          tagId
        }
      }
    }))
  };
}

export async function getImagesForShare(shareId: string, client: ShareQueryClient = db) {
  const share = await client.share.findUnique({
    where: {
      id: shareId
    },
    include: {
      tags: true
    }
  });

  if (!share) {
    return [];
  }

  return client.image.findMany({
    where: buildShareImageWhere(share),
    orderBy: {
      createdAt: "desc"
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
}

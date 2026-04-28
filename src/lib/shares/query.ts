import type { Prisma, ShareMatchMode } from "@prisma/client";
import { db } from "@/lib/db";

type ShareQueryClient = Pick<typeof db, "image" | "share">;

type ShareWithTagIds = {
  id: string;
  matchMode: ShareMatchMode;
  tags: Array<{ tagId: string }>;
};

export function buildShareImageWhere(share: ShareWithTagIds): Prisma.ImageWhereInput {
  const tagIds = share.tags.map((tag) => tag.tagId);

  if (!tagIds.length) {
    return {
      deletedAt: null
    };
  }

  if (share.matchMode === "ANY") {
    return {
      deletedAt: null,
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
    deletedAt: null,
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

import { db } from "@/lib/db";

type ShareQueryClient = Pick<typeof db, "image" | "share">;

export async function getImagesForShare(shareId: string, client: ShareQueryClient = db) {
  const share = await client.share.findUnique({
    where: {
      id: shareId
    },
    include: {
      images: {
        select: {
          imageId: true
        }
      }
    }
  });

  if (!share || !share.images.length) {
    return [];
  }

  return client.image.findMany({
    where: {
      deletedAt: null,
      uploaderId: share.creatorId,
      id: {
        in: share.images.map((image) => image.imageId)
      }
    },
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

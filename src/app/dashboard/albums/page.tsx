import type { Prisma } from "@prisma/client";
import { AlbumsBrowser } from "@/components/albums-browser";
import { parseAlbumsView } from "@/lib/albums/view";
import { db } from "@/lib/db";
import { getOssConfig } from "@/lib/oss/config";

export const dynamic = "force-dynamic";

type AlbumsPageProps = {
  searchParams?: Promise<{
    view?: string | string[];
    tag?: string | string[];
    from?: string | string[];
    to?: string | string[];
  }>;
};

function asSingleValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function asArray(value: string | string[] | undefined): string[] {
  return Array.isArray(value) ? value.filter(Boolean) : value ? [value] : [];
}

export default async function DashboardAlbumsPage({ searchParams }: AlbumsPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const view = parseAlbumsView(resolvedSearchParams.view);
  const selectedTagIds = Array.from(new Set(asArray(resolvedSearchParams.tag)));
  const fromDate = asSingleValue(resolvedSearchParams.from);
  const toDate = asSingleValue(resolvedSearchParams.to);
  const activeShareWhere: Prisma.ShareWhereInput = {
    revoked: false,
    OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }]
  };

  const [images, tags, imageCount, tagCount, activeShareCount, capturedImageCount] =
    await Promise.all([
      db.image.findMany({
        where: {
          deletedAt: null
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
      }),
      db.tag.findMany({
        orderBy: {
          name: "asc"
        }
      }),
      db.image.count({
        where: {
          deletedAt: null
        }
      }),
      db.tag.count(),
      db.share.count({
        where: activeShareWhere
      }),
      db.image.count({
        where: {
          deletedAt: null,
          exif: {
            takenAt: {
              not: null
            }
          }
        }
      })
    ]);

  const publicBaseUrl = getOssConfig().publicBaseUrl;

  return (
    <AlbumsBrowser
      view={view}
      selectedTagIds={selectedTagIds}
      fromDate={fromDate}
      toDate={toDate}
      publicBaseUrl={publicBaseUrl}
      stats={{
        imageCount,
        tagCount,
        activeShareCount,
        capturedImageCount
      }}
      tags={tags.map((tag) => ({
        id: tag.id,
        name: tag.name,
        slug: tag.slug,
        color: tag.color
      }))}
      images={images.map((image) => ({
        id: image.id,
        objectKey: image.objectKey,
        filename: image.filename,
        createdAt: image.createdAt.toISOString(),
        takenAt: image.exif?.takenAt?.toISOString() ?? null,
        tags: image.tags.map(({ tag }) => ({
          id: tag.id,
          name: tag.name,
          slug: tag.slug,
          color: tag.color
        }))
      }))}
    />
  );
}

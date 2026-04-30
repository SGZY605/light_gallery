import type { Prisma } from "@prisma/client";
import { AlbumsBrowser } from "@/components/albums-browser";
import { OssConfigRequiredNotice } from "@/components/oss-config-required-notice";
import { requireUser } from "@/lib/auth/session";
import { parseAlbumsView } from "@/lib/albums/view";
import { db } from "@/lib/db";
import { filterImagesExistingInOss } from "@/lib/images/sync";
import { resolveUserOssConfig } from "@/lib/oss/user-config";

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
  const user = await requireUser();
  const resolvedSearchParams = (await searchParams) ?? {};
  const view = parseAlbumsView(resolvedSearchParams.view);
  const selectedTagIds = Array.from(new Set(asArray(resolvedSearchParams.tag)));
  const fromDate = asSingleValue(resolvedSearchParams.from);
  const toDate = asSingleValue(resolvedSearchParams.to);
  const activeShareWhere: Prisma.ShareWhereInput = {
    creatorId: user.id,
    revoked: false,
    OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }]
  };

  const [images, tags, tagCount, activeShareCount] =
    await Promise.all([
      db.image.findMany({
        where: {
          deletedAt: null,
          uploaderId: user.id
        },
        orderBy: {
          createdAt: "desc"
        },
        include: {
          exif: true,
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
      }),
      db.tag.findMany({
        where: {
          creatorId: user.id
        },
        orderBy: {
          name: "asc"
        }
      }),
      db.tag.count({
        where: {
          creatorId: user.id
        }
      }),
      db.share.count({
        where: activeShareWhere
      })
    ]);

  const ossConfig = await resolveUserOssConfig({ user });

  if (!ossConfig) {
    return <OssConfigRequiredNotice />;
  }

  const publicBaseUrl = ossConfig.publicBaseUrl;
  const visibleImages = await filterImagesExistingInOss({
    config: ossConfig,
    images,
    userId: user.id
  });

  return (
    <AlbumsBrowser
      view={view}
      selectedTagIds={selectedTagIds}
      fromDate={fromDate}
      toDate={toDate}
      publicBaseUrl={publicBaseUrl}
      stats={{
        imageCount: visibleImages.length,
        tagCount,
        activeShareCount,
        capturedImageCount: visibleImages.filter((image) => image.exif?.takenAt).length
      }}
      tags={tags.map((tag) => ({
        id: tag.id,
        name: tag.name,
        slug: tag.slug,
        color: tag.color
      }))}
      images={visibleImages.map((image) => ({
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

import type { Prisma } from "@prisma/client";
import { LibraryPageShell } from "@/components/library-page-shell";
import { OssConfigRequiredNotice } from "@/components/oss-config-required-notice";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { resolveUserOssConfig } from "@/lib/oss/user-config";

type LibraryPageProps = {
  searchParams?: Promise<{
    q?: string | string[];
    tag?: string | string[];
  }>;
};

function asSingleValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function asArray(value: string | string[] | undefined): string[] {
  return Array.isArray(value) ? value.filter(Boolean) : value ? [value] : [];
}

export default async function DashboardLibraryPage({ searchParams }: LibraryPageProps) {
  const user = await requireUser();
  const resolvedSearchParams = (await searchParams) ?? {};
  const query = asSingleValue(resolvedSearchParams.q).trim();
  const selectedTagIds = Array.from(new Set(asArray(resolvedSearchParams.tag)));

  const where: Prisma.ImageWhereInput = {
    deletedAt: null,
    uploaderId: user.id,
    ...(query
      ? {
          OR: [
            { filename: { contains: query, mode: "insensitive" } },
            { description: { contains: query, mode: "insensitive" } }
          ]
        }
      : {}),
    ...(selectedTagIds.length
      ? {
          AND: selectedTagIds.map((tagId) => ({
            tags: {
              some: {
                tagId
              }
            }
          }))
        }
      : {})
  };

  const [images, tags] = await Promise.all([
    db.image.findMany({
      where,
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
    })
  ]);

  const ossConfig = await resolveUserOssConfig({ user });

  if (!ossConfig) {
    return <OssConfigRequiredNotice />;
  }

  const publicBaseUrl = ossConfig.publicBaseUrl;

  return (
    <LibraryPageShell
      initialColumnCount={user.libraryColumnCount}
      publicBaseUrl={publicBaseUrl}
      query={query}
      selectedTagIds={selectedTagIds}
      tags={tags}
      images={images.map((image) => ({
        id: image.id,
        objectKey: image.objectKey,
        filename: image.filename,
        description: image.description,
        width: image.width,
        height: image.height,
        createdAt: image.createdAt,
        exif: image.exif,
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

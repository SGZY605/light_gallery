import type { Prisma } from "@prisma/client";
import { ImageGrid } from "@/components/image-grid";
import { LibraryFilterBar } from "@/components/library-filter-bar";
import { db } from "@/lib/db";
import { getOssConfig } from "@/lib/oss/config";

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
  const resolvedSearchParams = (await searchParams) ?? {};
  const query = asSingleValue(resolvedSearchParams.q).trim();
  const selectedTagIds = Array.from(new Set(asArray(resolvedSearchParams.tag)));

  const where: Prisma.ImageWhereInput = {
    deletedAt: null,
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
          }
        }
      }
    }),
    db.tag.findMany({
      orderBy: {
        name: "asc"
      }
    })
  ]);

  const publicBaseUrl = getOssConfig().publicBaseUrl;

  return (
    <div className="space-y-4">
      <LibraryFilterBar query={query} selectedTagIds={selectedTagIds} tags={tags} />

      <ImageGrid
        publicBaseUrl={publicBaseUrl}
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
    </div>
  );
}

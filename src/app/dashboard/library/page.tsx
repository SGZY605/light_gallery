import type { Prisma } from "@prisma/client";
import Link from "next/link";
import { ImageGrid } from "@/components/image-grid";
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

function buildTagHref(selectedTagIds: string[], tagId: string, query: string) {
  const nextTagIds = selectedTagIds.includes(tagId)
    ? selectedTagIds.filter((selectedTagId) => selectedTagId !== tagId)
    : [...selectedTagIds, tagId];
  const params = new URLSearchParams();

  if (query) {
    params.set("q", query);
  }

  nextTagIds.forEach((selectedTagId) => {
    params.append("tag", selectedTagId);
  });

  const queryString = params.toString();
  return queryString ? `/dashboard/library?${queryString}` : "/dashboard/library";
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
      {/* Floating search + tag filter bar */}
      <div className="sticky top-0 z-20 -mx-1 px-1 pb-2 pt-1">
        <div className="flex flex-wrap items-center gap-2 bg-black/50 backdrop-blur-sm p-2">
          <form className="flex-1 flex items-center gap-2 min-w-0">
            <input
              name="q"
              defaultValue={query}
              className="flex-1 min-w-0 bg-transparent px-2 py-1 text-xs text-white placeholder:text-white/20 outline-none border-b border-white/[0.04] transition focus:border-white/10"
              placeholder="搜索文件名或描述"
            />
            {selectedTagIds.map((tagId) => (
              <input key={tagId} type="hidden" name="tag" value={tagId} />
            ))}
            <button
              type="submit"
              className="px-2 py-1 text-[10px] font-medium text-white/30 transition hover:text-white/50"
            >
              筛选
            </button>
          </form>

          {/* Tag pills */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {tags.map((tag) => {
                const active = selectedTagIds.includes(tag.id);

                return (
                  <Link
                    key={tag.id}
                    href={buildTagHref(selectedTagIds, tag.id, query)}
                    className={[
                      "rounded-full px-1.5 py-0.5 text-[10px] font-medium transition",
                      active
                        ? "text-white/80"
                        : "text-white/30 hover:text-white/50"
                    ].join(" ")}
                  >
                    {tag.name}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

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

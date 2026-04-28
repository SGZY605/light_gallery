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
    <div className="space-y-8">
      <section className="rounded-[32px] border border-border bg-card p-7 shadow-[0_0_40px_rgba(0,0,0,0.5)]">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-white/50">Library</p>
            <h2 className="mt-2 text-3xl font-semibold text-white/90">Search fast, batch later, and keep the grid dense.</h2>
          </div>

          <Link
            href="/dashboard/upload"
            className="inline-flex rounded-full bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
          >
            Add more photos
          </Link>
        </div>

        <form className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
          <input
            name="q"
            defaultValue={query}
            className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-white/30 focus:ring-2 focus:ring-white/10"
            placeholder="Search filenames or descriptions"
          />
          {selectedTagIds.map((tagId) => (
            <input key={tagId} type="hidden" name="tag" value={tagId} />
          ))}
          <button
            type="submit"
            className="rounded-2xl border border-border px-5 py-3 text-sm font-semibold text-white/70 transition hover:border-white/50 hover:text-white"
          >
            Apply filters
          </button>
        </form>

        <div className="mt-6 flex flex-wrap gap-2">
          {tags.map((tag) => {
            const active = selectedTagIds.includes(tag.id);

            return (
              <Link
                key={tag.id}
                href={buildTagHref(selectedTagIds, tag.id, query)}
                className={[
                  "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                  active
                    ? "border-white/30 bg-white/10 text-white"
                    : "border-border bg-surface text-white/70 hover:border-white/30"
                ].join(" ")}
              >
                {tag.name}
              </Link>
            );
          })}
        </div>
      </section>

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

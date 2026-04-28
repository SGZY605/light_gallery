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
  const publicBaseUrl = getOssConfig().publicBaseUrl;
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

  return (
    <div className="space-y-8">
      <section className="rounded-[32px] border border-slate-200 bg-white p-7 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-400">图库</p>
            <h2 className="mt-2 text-3xl font-semibold text-slate-950">更快搜索，稍后批量整理，让网格始终保持紧凑。</h2>
          </div>

          <Link
            href="/dashboard/upload"
            className="inline-flex rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            继续上传照片
          </Link>
        </div>

        <form className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
          <input
            name="q"
            defaultValue={query}
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
            placeholder="搜索文件名或描述"
          />
          {selectedTagIds.map((tagId) => (
            <input key={tagId} type="hidden" name="tag" value={tagId} />
          ))}
          <button
            type="submit"
            className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-950 hover:text-slate-950"
          >
            应用筛选
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
                    ? "border-slate-950 bg-slate-950 text-white"
                    : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-400"
                ].join(" ")}
              >
                {tag.name}
              </Link>
            );
          })}
        </div>
      </section>

      <section className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
        <div className="mt-1">
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
      </section>
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { AlbumPhotoTile } from "@/components/album-photo-tile";
import { requireUser } from "@/lib/auth/session";
import { findMemoryHighlightById, buildMemoryShareHref } from "@/lib/albums/view";
import { db } from "@/lib/db";
import { filterImagesExistingInOss } from "@/lib/images/sync";
import { resolveUserOssConfig } from "@/lib/oss/user-config";

export const dynamic = "force-dynamic";

type MemoryPageProps = {
  params: Promise<{
    memoryId: string;
  }>;
};

export default async function AlbumMemoryPage({ params }: MemoryPageProps) {
  const user = await requireUser();
  const { memoryId } = await params;
  const ossConfig = await resolveUserOssConfig({ user });

  if (!ossConfig) {
    return null;
  }

  const images = await db.image.findMany({
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
  });

  const visibleImages = await filterImagesExistingInOss({
    config: ossConfig,
    images,
    userId: user.id
  });
  const memory = findMemoryHighlightById(
    visibleImages.map((image) => ({
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
    })),
    memoryId
  );

  if (!memory) {
    notFound();
  }

  return (
    <div className="space-y-5">
      <section className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
        <div className="space-y-2">
          <Link
            href="/dashboard/albums"
            className="text-xs font-medium text-[color:var(--text-muted)] transition hover:text-[color:var(--text-primary)]"
          >
            返回相册
          </Link>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[color:var(--text-faint)]">
              回忆精选
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-[color:var(--text-primary)]">
              {memory.title}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[color:var(--text-muted)]">
              {memory.description}
            </p>
          </div>
        </div>

        <Link
          href={buildMemoryShareHref({
            title: memory.title,
            shareDescription: memory.shareDescription,
            imageIds: memory.imageIds
          })}
          className="rounded-md bg-[color:var(--text-primary)] px-4 py-2 text-xs font-semibold text-[color:var(--page-bg)] transition hover:opacity-85"
        >
          带去分享
        </Link>
      </section>

      <section className="grid grid-cols-3 gap-1 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-7 2xl:grid-cols-8">
        {memory.images.map((image) => (
          <AlbumPhotoTile key={image.id} {...image} publicBaseUrl={ossConfig.publicBaseUrl} />
        ))}
      </section>
    </div>
  );
}

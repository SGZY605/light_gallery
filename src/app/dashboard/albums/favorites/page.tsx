import Link from "next/link";
import { AlbumPhotoTile } from "@/components/album-photo-tile";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { filterImagesExistingInOss } from "@/lib/images/sync";
import { resolveUserOssConfig } from "@/lib/oss/user-config";

export const dynamic = "force-dynamic";

export default async function FavoriteAlbumPage() {
  const user = await requireUser();
  const ossConfig = await resolveUserOssConfig({ user });

  if (!ossConfig) {
    return null;
  }

  const images = await db.image.findMany({
    where: {
      deletedAt: null,
      featured: true,
      uploaderId: user.id
    },
    orderBy: {
      updatedAt: "desc"
    }
  });
  const visibleImages = await filterImagesExistingInOss({
    config: ossConfig,
    images,
    userId: user.id
  });

  return (
    <div className="space-y-5">
      <section className="border-b border-border pb-4">
        <Link
          href="/dashboard/albums"
          className="text-xs font-medium text-[color:var(--text-muted)] transition hover:text-[color:var(--text-primary)]"
        >
          返回相册
        </Link>
        <div className="mt-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[color:var(--text-faint)]">
            收藏相册
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-[color:var(--text-primary)]">
            被红心留下的照片
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[color:var(--text-muted)]">
            这里收集你在详情页点亮红心的照片，适合放那些最想反复打开的瞬间。
          </p>
        </div>
      </section>

      {visibleImages.length ? (
        <section className="grid grid-cols-3 gap-1 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-7 2xl:grid-cols-8">
          {visibleImages.map((image, index) => (
            <AlbumPhotoTile
              key={image.id}
              id={image.id}
              objectKey={image.objectKey}
              filename={image.filename}
              publicBaseUrl={ossConfig.publicBaseUrl}
              entryIndex={index}
            />
          ))}
        </section>
      ) : (
        <div className="rounded-md border border-dashed border-border px-6 py-16 text-center text-sm text-[color:var(--text-muted)]">
          暂无收藏照片。进入照片详情后点亮红心，就会出现在这里。
        </div>
      )}
    </div>
  );
}

import { ShareGallery } from "@/components/share-gallery";
import { db } from "@/lib/db";
import { filterImagesExistingInOss } from "@/lib/images/sync";
import { resolveUserOssConfig } from "@/lib/oss/user-config";
import { getImagesForShare } from "@/lib/shares/query";
import { getShareState } from "@/lib/shares/tokens";

export const dynamic = "force-dynamic";

type SharePageProps = {
  params: Promise<{
    token: string;
  }>;
};

function UnavailableShare({ title, message }: { title: string; message: string }) {
  return (
    <main className="min-h-screen bg-black px-6 py-16 text-white">
      <div className="mx-auto max-w-3xl px-8 py-14 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.36em] text-amber-300">分享不可用</p>
        <h1 className="mt-4 text-2xl font-semibold">{title}</h1>
        <p className="mt-4 text-sm leading-7 text-white/70">{message}</p>
      </div>
    </main>
  );
}

export default async function PublicSharePage({ params }: SharePageProps) {
  const { token } = await params;
  const share = await db.share.findUnique({
    where: {
      token
    },
    include: {
      creator: true,
      tags: {
        include: {
          tag: true
        }
      }
    }
  });

  if (!share) {
    return <UnavailableShare title="分享不存在" message="此分享链接不存在或已被删除。" />;
  }

  const shareState = getShareState(share);

  if (shareState === "expired") {
    return <UnavailableShare title={share.title} message="此分享已过期，不再可用。" />;
  }

  if (shareState === "revoked") {
    return <UnavailableShare title={share.title} message="此分享已被所有者撤销，不再公开。" />;
  }

  const images = await getImagesForShare(share.id);
  const ossConfig = await resolveUserOssConfig({ user: share.creator });

  if (!ossConfig) {
    return <UnavailableShare title={share.title} message="姝ゅ垎浜殑瀛樺偍閰嶇疆涓嶅彲鐢紝鏆傛椂鏃犳硶鎵撳紑銆?" />;
  }

  const visibleImages = await filterImagesExistingInOss({
    config: ossConfig,
    images,
    userId: share.creatorId
  });

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="space-y-4">
        <section className="px-4 sm:px-8 pt-6">
          <h1 className="text-2xl font-semibold text-white/80">{share.title}</h1>
          {share.description ? <p className="mt-1 max-w-2xl text-sm text-white/40">{share.description}</p> : null}
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-white/25">
            <span>{share.creator.name}</span>
            <span className="text-white/10">·</span>
            <span>{visibleImages.length} 张图片</span>
          </div>
          {share.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {share.tags.map(({ tag }) => (
                <span
                  key={tag.id}
                  className="text-[10px] text-white/25"
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}
          <div className="mt-4 border-b border-white/[0.04]" />
        </section>

        <ShareGallery
          allowDownload={share.allowDownload}
          publicBaseUrl={ossConfig.publicBaseUrl}
          images={visibleImages.map((image) => ({
            id: image.id,
            objectKey: image.objectKey,
            filename: image.filename,
            description: image.description,
            width: image.width,
            height: image.height,
            exif: image.exif,
            tags: image.tags.map(({ tag }) => ({
              id: tag.id,
              name: tag.name,
              slug: tag.slug
            }))
          }))}
        />
      </div>
    </main>
  );
}

import { ShareGallery } from "@/components/share-gallery";
import { db } from "@/lib/db";
import { getOssConfig } from "@/lib/oss/config";
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
        <p className="text-xs font-semibold uppercase tracking-[0.36em] text-amber-300">Share unavailable</p>
        <h1 className="mt-4 text-4xl font-semibold">{title}</h1>
        <p className="mt-4 text-base leading-7 text-white/70">{message}</p>
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
    return <UnavailableShare title="Unknown share" message="This share token does not exist or has already been removed." />;
  }

  const shareState = getShareState(share);

  if (shareState === "expired") {
    return <UnavailableShare title={share.title} message="This share expired and is no longer available." />;
  }

  if (shareState === "revoked") {
    return <UnavailableShare title={share.title} message="This share was revoked by its owner and is no longer public." />;
  }

  const images = await getImagesForShare(share.id);

  return (
    <main className="min-h-screen bg-black py-12 text-white">
      <div className="space-y-10">
        <section className="px-4 sm:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.36em] text-amber-300">Shared Gallery</p>
          <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-end">
            <div>
              <h1 className="text-4xl font-semibold leading-tight text-white">{share.title}</h1>
              {share.description ? <p className="mt-4 max-w-3xl text-base leading-7 text-white/75">{share.description}</p> : null}
            </div>

            <div className="space-y-3 rounded-[28px] border border-white/[0.06] bg-[#111111] p-5 text-sm text-white/70">
              <p>Curated by {share.creator.name}</p>
              <p>{images.length} image{images.length === 1 ? "" : "s"} currently match this share.</p>
              <div className="flex flex-wrap gap-2">
                {share.tags.map(({ tag }) => (
                  <span
                    key={tag.id}
                    className="rounded-full border border-white/[0.06] bg-[#0a0a0a] px-3 py-1 text-xs font-semibold text-white/75"
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <ShareGallery
          allowDownload={share.allowDownload}
          publicBaseUrl={getOssConfig().publicBaseUrl}
          title={share.title}
          images={images.map((image) => ({
            id: image.id,
            objectKey: image.objectKey,
            filename: image.filename,
            description: image.description,
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

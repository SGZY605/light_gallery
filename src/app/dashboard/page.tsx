import Link from "next/link";
import { db } from "@/lib/db";

function StatCard({
  label,
  value,
  description
}: {
  label: string;
  value: number;
  description: string;
}) {
  return (
    <article className="rounded-[28px] border border-border bg-card p-6 shadow-[0_0_40px_rgba(0,0,0,0.5)]">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/50">{label}</p>
      <p className="mt-5 text-4xl font-semibold text-white/90">{value}</p>
      <p className="mt-3 text-sm leading-6 text-white/70">{description}</p>
    </article>
  );
}

export default async function DashboardOverviewPage() {
  const [imageCount, tagCount, activeShareCount, recentUploads] = await Promise.all([
    db.image.count({
      where: {
        deletedAt: null
      }
    }),
    db.tag.count(),
    db.share.count({
      where: {
        revoked: false,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }]
      }
    }),
    db.image.findMany({
      where: {
        deletedAt: null
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 5,
      include: {
        uploader: true
      }
    })
  ]);

  return (
    <div className="space-y-8">
      <section className="rounded-[32px] border border-border bg-card px-7 py-7 shadow-[0_0_40px_rgba(0,0,0,0.5)]">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-amber-300">Overview</p>
        <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-3xl font-semibold text-white/90">A compact control room for your private photo library.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70">
              Keep uploads moving, monitor share links, and jump back into the library without navigating through a public homepage.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard/upload"
              className="rounded-full bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
            >
              Upload photos
            </Link>
            <Link
              href="/dashboard/shares"
              className="rounded-full border border-border px-5 py-3 text-sm font-semibold text-white/70 transition hover:border-white/50 hover:text-white"
            >
              Manage shares
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-3">
        <StatCard label="Images" value={imageCount} description="Non-deleted originals currently indexed in the application database." />
        <StatCard label="Tags" value={tagCount} description="Named tags available for filtering, organization, and dynamic share rules." />
        <StatCard label="Active Shares" value={activeShareCount} description="Currently valid public tag-based share links that have not expired or been revoked." />
      </section>

      <section className="rounded-[32px] border border-border bg-card p-7 shadow-[0_0_40px_rgba(0,0,0,0.5)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-white/50">Recent Uploads</p>
            <h3 className="mt-2 text-xl font-semibold text-white/90">Latest images</h3>
          </div>
          <Link href="/dashboard/library" className="text-sm font-semibold text-white/70 transition hover:text-white">
            Open library
          </Link>
        </div>

        <div className="mt-5 space-y-3">
          {recentUploads.length ? (
            recentUploads.map((image) => (
              <article
                key={image.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-4 py-4"
              >
                <div>
                  <p className="font-medium text-white/90">{image.filename}</p>
                  <p className="text-sm text-white/50">
                    Uploaded by {image.uploader.name} • {(image.sizeBytes / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
                <p className="text-xs uppercase tracking-[0.2em] text-white/50">
                  {new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(image.createdAt)}
                </p>
              </article>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-border px-6 py-12 text-center text-sm text-white/50">
              No uploads have been recorded yet.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

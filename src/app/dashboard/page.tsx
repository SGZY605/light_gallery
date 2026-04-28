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
    <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">{label}</p>
      <p className="mt-5 text-4xl font-semibold text-slate-950">{value}</p>
      <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
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
      <section className="rounded-[32px] border border-slate-200 bg-white/90 px-7 py-7 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-amber-600">Overview</p>
        <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-3xl font-semibold text-slate-950">A compact control room for your private photo library.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Keep uploads moving, monitor share links, and jump back into the library without navigating through a public homepage.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard/upload"
              className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Upload photos
            </Link>
            <Link
              href="/dashboard/shares"
              className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-950 hover:text-slate-950"
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

      <section className="rounded-[32px] border border-slate-200 bg-white p-7 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-400">Recent Uploads</p>
            <h3 className="mt-2 text-xl font-semibold text-slate-950">Latest images</h3>
          </div>
          <Link href="/dashboard/library" className="text-sm font-semibold text-slate-700 transition hover:text-slate-950">
            Open library
          </Link>
        </div>

        <div className="mt-5 space-y-3">
          {recentUploads.length ? (
            recentUploads.map((image) => (
              <article
                key={image.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
              >
                <div>
                  <p className="font-medium text-slate-900">{image.filename}</p>
                  <p className="text-sm text-slate-500">
                    Uploaded by {image.uploader.name} • {(image.sizeBytes / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  {new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(image.createdAt)}
                </p>
              </article>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-12 text-center text-sm text-slate-500">
              No uploads have been recorded yet.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

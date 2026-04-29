import Link from "next/link";
import { db } from "@/lib/db";

function StatCard({
  label,
  value
}: {
  label: string;
  value: number;
}) {
  return (
    <article className="border border-white/[0.04] p-3">
      <p className="text-[10px] uppercase tracking-[0.2em] text-white/20">{label}</p>
      <p className="mt-1 text-xl font-semibold text-white/40">{value}</p>
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
    <div className="space-y-4">
      <section>
        <h2 className="text-base font-semibold text-white/40">图库概览</h2>
      </section>

      <section className="grid gap-2 md:grid-cols-3">
        <StatCard label="图片" value={imageCount} />
        <StatCard label="标签" value={tagCount} />
        <StatCard label="活跃分享" value={activeShareCount} />
      </section>

      <section className="border-t border-white/[0.04] pt-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-2">
          <p className="text-xs font-medium text-white/30">最近上传</p>
          <Link href="/dashboard/library" className="text-[10px] text-white/20 transition hover:text-white/40">
            打开图库 →
          </Link>
        </div>

        <div className="space-y-1">
          {recentUploads.length ? (
            recentUploads.map((image) => (
              <article
                key={image.id}
                className="flex flex-wrap items-center justify-between gap-3 px-1 py-1.5 border-b border-white/[0.02]"
              >
                <div>
                  <p className="text-xs text-white/40">{image.filename}</p>
                  <p className="text-[10px] text-white/20">
                  上传者 {image.uploader.name} • {(image.sizeBytes / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
                <p className="text-[10px] text-white/20">
                  {new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(image.createdAt)}
                </p>
              </article>
            ))
          ) : (
            <div className="py-8 text-center text-[10px] text-white/15">
              暂无上传记录。
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

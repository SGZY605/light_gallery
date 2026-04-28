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
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-amber-600">概览</p>
        <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-3xl font-semibold text-slate-950">私有照片库的精简控制台。</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              保持上传流转顺畅，跟踪分享链接，并且无需经过公开首页即可快速回到图库。
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard/upload"
              className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              上传照片
            </Link>
            <Link
              href="/dashboard/shares"
              className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-950 hover:text-slate-950"
            >
              管理分享
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-3">
        <StatCard label="图片" value={imageCount} description="当前应用数据库中已索引且未删除的原图数量。" />
        <StatCard label="标签" value={tagCount} description="可用于筛选、整理和动态分享规则的命名标签数量。" />
        <StatCard label="有效分享" value={activeShareCount} description="当前仍然有效、未过期且未撤销的公开标签分享链接数量。" />
      </section>

      <section className="rounded-[32px] border border-slate-200 bg-white p-7 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-400">最近上传</p>
            <h3 className="mt-2 text-xl font-semibold text-slate-950">最新图片</h3>
          </div>
          <Link href="/dashboard/library" className="text-sm font-semibold text-slate-700 transition hover:text-slate-950">
            打开图库
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
                    上传者：{image.uploader.name} | {(image.sizeBytes / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  {new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium" }).format(image.createdAt)}
                </p>
              </article>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-12 text-center text-sm text-slate-500">
              还没有上传记录。
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

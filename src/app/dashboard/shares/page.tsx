import { revalidatePath } from "next/cache";
import { CopyShareButton } from "@/components/copy-share-button";
import { canRevokeShare } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { createShareToken, getShareState } from "@/lib/shares/tokens";

export const dynamic = "force-dynamic";

const shareStateLabels = {
  active: "有效",
  expired: "已过期",
  revoked: "已撤销"
} as const;

async function createShareAction(formData: FormData) {
  "use server";

  const user = await requireUser();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const tagIds = Array.from(new Set(formData.getAll("tagIds").map((value) => String(value)).filter(Boolean)));
  const expiresAtValue = String(formData.get("expiresAt") ?? "").trim();
  const allowDownload = formData.get("allowDownload") === "on";

  if (!title || !tagIds.length) {
    return;
  }

  await db.share.create({
    data: {
      token: createShareToken(),
      title,
      description: description || null,
      expiresAt: expiresAtValue ? new Date(expiresAtValue) : null,
      allowDownload,
      creatorId: user.id,
      tags: {
        create: tagIds.map((tagId) => ({
          tagId
        }))
      }
    }
  });

  revalidatePath("/dashboard/shares");
}

async function revokeShareAction(formData: FormData) {
  "use server";

  const user = await requireUser();

  if (!canRevokeShare(user.role)) {
    return;
  }

  const shareId = String(formData.get("shareId") ?? "");

  if (!shareId) {
    return;
  }

  await db.share.update({
    where: {
      id: shareId
    },
    data: {
      revoked: true,
      revokedAt: new Date()
    }
  });

  revalidatePath("/dashboard/shares");
}

export default async function DashboardSharesPage() {
  const user = await requireUser();
  const [tags, shares] = await Promise.all([
    db.tag.findMany({
      orderBy: {
        name: "asc"
      }
    }),
    db.share.findMany({
      orderBy: {
        createdAt: "desc"
      },
      include: {
        creator: true,
        tags: {
          include: {
            tag: true
          }
        }
      }
    })
  ]);

  return (
    <div className="space-y-8">
      <section className="rounded-[32px] border border-slate-200 bg-white p-7 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-400">分享</p>
        <h2 className="mt-3 text-3xl font-semibold text-slate-950">发布基于筛选规则的公开图库，无需复制图片元数据。</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          每个分享都是由标签规则驱动的令牌公开页。只要分享未过期也未撤销，后续符合标签的新上传图片会自动显示。
        </p>
      </section>

      <section className="rounded-[32px] border border-slate-200 bg-white p-7 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-amber-600">创建分享</p>
          <h3 className="mt-2 text-2xl font-semibold text-slate-950">选择用于定义公开视图的标签。</h3>
        </div>

        <form action={createShareAction} className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-4">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">标题</span>
              <input
                name="title"
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                placeholder="家庭旅行精选"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">描述</span>
              <textarea
                name="description"
                rows={4}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                placeholder="显示在公开图库上方的可选说明"
              />
            </label>

            <div className="space-y-3">
              <span className="text-sm font-medium text-slate-700">标签筛选</span>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <label
                    key={tag.id}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700"
                  >
                    <input type="checkbox" name="tagIds" value={tag.id} className="h-3.5 w-3.5" />
                    <span>{tag.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4 rounded-[28px] border border-slate-200 bg-slate-50 p-5">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">过期时间</span>
              <input
                name="expiresAt"
                type="datetime-local"
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
              />
            </label>

            <label className="inline-flex items-center gap-3 text-sm text-slate-700">
              <input type="checkbox" name="allowDownload" className="h-4 w-4" />
              <span>允许在公开页下载原图</span>
            </label>

            <button
              type="submit"
              className="w-full rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              创建分享
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-[32px] border border-slate-200 bg-white p-7 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
        <div className="border-b border-slate-200 pb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-400">分享链接</p>
          <h3 className="mt-2 text-2xl font-semibold text-slate-950">有效、已过期和已撤销的链接</h3>
        </div>

        <div className="mt-6 space-y-4">
          {shares.length ? (
            shares.map((share) => {
              const shareState = getShareState(share);

              return (
                <article
                  key={share.id}
                  className="rounded-[28px] border border-slate-200 bg-slate-50 p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-xl font-semibold text-slate-950">{share.title}</h4>
                          <span
                            className={[
                              "rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]",
                              shareState === "active"
                                ? "bg-emerald-100 text-emerald-700"
                                : shareState === "expired"
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-red-100 text-red-700"
                            ].join(" ")}
                          >
                            {shareStateLabels[shareState]}
                          </span>
                        </div>
                        {share.description ? <p className="mt-2 text-sm leading-6 text-slate-600">{share.description}</p> : null}
                      </div>

                      <p className="text-sm text-slate-500">
                        /s/{share.token} | 创建者：{share.creator.name}
                        {share.expiresAt
                          ? ` | 过期于 ${new Intl.DateTimeFormat("zh-CN", {
                              dateStyle: "medium",
                              timeStyle: "short"
                            }).format(share.expiresAt)}`
                          : " | 永不过期"}
                      </p>

                      <div className="flex flex-wrap gap-2">
                        {share.tags.map(({ tag }) => (
                          <span
                            key={tag.id}
                            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600"
                          >
                            {tag.name}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <CopyShareButton token={share.token} />
                      {shareState === "active" && canRevokeShare(user.role) ? (
                        <form action={revokeShareAction}>
                          <input type="hidden" name="shareId" value={share.id} />
                          <button
                            type="submit"
                            className="rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:border-red-400"
                          >
                            撤销
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-12 text-center text-sm text-slate-500">
              还没有创建分享链接。
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

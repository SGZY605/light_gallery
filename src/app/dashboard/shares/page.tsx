import { revalidatePath } from "next/cache";
import { CopyShareButton } from "@/components/copy-share-button";
import { canRevokeShare } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { createShareToken, getShareState } from "@/lib/shares/tokens";

export const dynamic = "force-dynamic";

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
      <section className="rounded-[32px] border border-border bg-card p-7 shadow-[0_0_40px_rgba(0,0,0,0.5)]">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-white/50">Shares</p>
        <h2 className="mt-3 text-3xl font-semibold text-white/90">Publish filtered public galleries without duplicating image metadata.</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-white/70">
          Each share is a tokenized public page backed by tag rules. New uploads with matching tags appear automatically until the share expires or is revoked.
        </p>
      </section>

      <section className="rounded-[32px] border border-border bg-card p-7 shadow-[0_0_40px_rgba(0,0,0,0.5)]">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-amber-600">Create Share</p>
          <h3 className="mt-2 text-2xl font-semibold text-white/90">Select the tags that define the public view.</h3>
        </div>

        <form action={createShareAction} className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-4">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-white/70">Title</span>
              <input
                name="title"
                className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-white/30 focus:ring-2 focus:ring-white/10"
                placeholder="Family trip highlights"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-white/70">Description</span>
              <textarea
                name="description"
                rows={4}
                className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-white/30 focus:ring-2 focus:ring-white/10"
                placeholder="Optional context shown above the public gallery"
              />
            </label>

            <div className="space-y-3">
              <span className="text-sm font-medium text-white/70">Tag filter</span>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <label
                    key={tag.id}
                    className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-white/70"
                  >
                    <input type="checkbox" name="tagIds" value={tag.id} className="h-3.5 w-3.5" />
                    <span>{tag.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4 rounded-[28px] border border-border bg-surface p-5">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-white/70">Expiration</span>
              <input
                name="expiresAt"
                type="datetime-local"
                className="w-full rounded-2xl border border-border bg-[#0a0a0a] px-4 py-3 text-sm text-white outline-none transition focus:border-white/30 focus:ring-2 focus:ring-white/10"
              />
            </label>

            <label className="inline-flex items-center gap-3 text-sm text-white/70">
              <input type="checkbox" name="allowDownload" className="h-4 w-4" />
              <span>Allow original downloads on the public page</span>
            </label>

            <button
              type="submit"
              className="w-full rounded-2xl bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
            >
              Create share
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-[32px] border border-border bg-card p-7 shadow-[0_0_40px_rgba(0,0,0,0.5)]">
        <div className="border-b border-border pb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-white/50">Share Links</p>
          <h3 className="mt-2 text-2xl font-semibold text-white/90">Active, expired, and revoked links</h3>
        </div>

        <div className="mt-6 space-y-4">
          {shares.length ? (
            shares.map((share) => {
              const shareState = getShareState(share);

              return (
                <article
                  key={share.id}
                  className="rounded-[28px] border border-border bg-surface p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-xl font-semibold text-white/90">{share.title}</h4>
                          <span
                            className={[
                              "rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]",
                              shareState === "active"
                                ? "bg-emerald-500/20 text-emerald-400"
                                : shareState === "expired"
                                  ? "bg-amber-500/20 text-amber-400"
                                  : "bg-red-500/20 text-red-400"
                            ].join(" ")}
                          >
                            {shareState}
                          </span>
                        </div>
                        {share.description ? <p className="mt-2 text-sm leading-6 text-white/70">{share.description}</p> : null}
                      </div>

                      <p className="text-sm text-white/50">
                        /s/{share.token} • created by {share.creator.name}
                        {share.expiresAt
                          ? ` • expires ${new Intl.DateTimeFormat("en", {
                              dateStyle: "medium",
                              timeStyle: "short"
                            }).format(share.expiresAt)}`
                          : " • no expiration"}
                      </p>

                      <div className="flex flex-wrap gap-2">
                        {share.tags.map(({ tag }) => (
                          <span
                            key={tag.id}
                            className="rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-white/70"
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
                            className="rounded-full border border-red-500/30 px-3 py-1.5 text-xs font-semibold text-red-400 transition hover:border-red-500/50"
                          >
                            Revoke
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="rounded-2xl border border-dashed border-border px-6 py-12 text-center text-sm text-white/50">
              No share links have been created yet.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

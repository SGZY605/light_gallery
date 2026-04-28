import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { normalizeTagName, slugifyTagName } from "@/lib/tags";

export const dynamic = "force-dynamic";

async function renameTagAction(formData: FormData) {
  "use server";

  await requireUser();

  const tagId = String(formData.get("tagId") ?? "");
  const nextName = normalizeTagName(String(formData.get("name") ?? ""));

  if (!tagId || !nextName) {
    return;
  }

  const nextSlug = slugifyTagName(nextName);
  const existingTag = await db.tag.findUnique({
    where: {
      slug: nextSlug
    }
  });

  if (existingTag && existingTag.id !== tagId) {
    return;
  }

  await db.tag.update({
    where: {
      id: tagId
    },
    data: {
      name: nextName,
      slug: nextSlug
    }
  });

  revalidatePath("/dashboard/tags");
  revalidatePath("/dashboard/library");
  revalidatePath("/dashboard/shares");
}

async function mergeTagsAction(formData: FormData) {
  "use server";

  await requireUser();

  const sourceTagId = String(formData.get("sourceTagId") ?? "");
  const targetTagId = String(formData.get("targetTagId") ?? "");

  if (!sourceTagId || !targetTagId || sourceTagId === targetTagId) {
    return;
  }

  await db.$transaction(async (tx) => {
    const [sourceTag, targetTag] = await Promise.all([
      tx.tag.findUnique({ where: { id: sourceTagId } }),
      tx.tag.findUnique({ where: { id: targetTagId } })
    ]);

    if (!sourceTag || !targetTag) {
      return;
    }

    const [sourceImageLinks, targetImageLinks, sourceShareLinks, targetShareLinks] = await Promise.all([
      tx.imageTag.findMany({
        where: {
          tagId: sourceTagId
        },
        select: {
          imageId: true
        }
      }),
      tx.imageTag.findMany({
        where: {
          tagId: targetTagId
        },
        select: {
          imageId: true
        }
      }),
      tx.shareTag.findMany({
        where: {
          tagId: sourceTagId
        },
        select: {
          shareId: true
        }
      }),
      tx.shareTag.findMany({
        where: {
          tagId: targetTagId
        },
        select: {
          shareId: true
        }
      })
    ]);

    const targetImageIds = new Set(targetImageLinks.map((link) => link.imageId));
    const targetShareIds = new Set(targetShareLinks.map((link) => link.shareId));
    const imageRowsToCreate = sourceImageLinks
      .filter((link) => !targetImageIds.has(link.imageId))
      .map((link) => ({
        imageId: link.imageId,
        tagId: targetTagId
      }));
    const shareRowsToCreate = sourceShareLinks
      .filter((link) => !targetShareIds.has(link.shareId))
      .map((link) => ({
        shareId: link.shareId,
        tagId: targetTagId
      }));

    if (imageRowsToCreate.length) {
      await tx.imageTag.createMany({
        data: imageRowsToCreate
      });
    }

    if (shareRowsToCreate.length) {
      await tx.shareTag.createMany({
        data: shareRowsToCreate
      });
    }

    await Promise.all([
      tx.imageTag.deleteMany({
        where: {
          tagId: sourceTagId
        }
      }),
      tx.shareTag.deleteMany({
        where: {
          tagId: sourceTagId
        }
      })
    ]);

    await tx.tag.delete({
      where: {
        id: sourceTagId
      }
    });
  });

  revalidatePath("/dashboard/tags");
  revalidatePath("/dashboard/library");
  revalidatePath("/dashboard/shares");
}

export default async function DashboardTagsPage() {
  const tags = await db.tag.findMany({
    orderBy: {
      name: "asc"
    },
    include: {
      _count: {
        select: {
          images: true,
          shares: true
        }
      }
    }
  });

  return (
    <div className="space-y-8">
      <section className="rounded-[32px] border border-border bg-card px-7 py-7 shadow-[0_0_40px_rgba(0,0,0,0.5)]">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-white/50">Tags</p>
        <h2 className="mt-3 text-3xl font-semibold text-white/90">Keep the vocabulary tight so the library stays filterable.</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-white/70">
          Rename tags in place or merge duplicate concepts into a single canonical tag. Merge operations update image relations and dynamic shares before deleting the source tag.
        </p>
      </section>

      <section className="rounded-[32px] border border-border bg-card p-7 shadow-[0_0_40px_rgba(0,0,0,0.5)]">
        <div className="grid gap-4">
          {tags.map((tag) => (
            <form
              key={tag.id}
              action={renameTagAction}
              className="grid gap-4 rounded-[28px] border border-border bg-surface p-4 lg:grid-cols-[minmax(0,1fr)_180px_180px_auto]"
            >
              <input type="hidden" name="tagId" value={tag.id} />
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.24em] text-white/50">Tag name</span>
                <input
                  name="name"
                  defaultValue={tag.name}
                  className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-white/30 focus:ring-2 focus:ring-white/10"
                />
              </label>
              <div className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.24em] text-white/50">Images</span>
                <p className="rounded-2xl border border-border bg-[#0a0a0a] px-4 py-3 text-sm font-medium text-white/70">
                  {tag._count.images}
                </p>
              </div>
              <div className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.24em] text-white/50">Shares</span>
                <p className="rounded-2xl border border-border bg-[#0a0a0a] px-4 py-3 text-sm font-medium text-white/70">
                  {tag._count.shares}
                </p>
              </div>
              <button
                type="submit"
                className="self-end rounded-2xl bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
              >
                Rename
              </button>
            </form>
          ))}
        </div>
      </section>

      <section className="rounded-[32px] border border-border bg-card p-7 shadow-[0_0_40px_rgba(0,0,0,0.5)]">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-white/50">Merge</p>
          <h3 className="mt-2 text-2xl font-semibold text-white/90">Collapse duplicates into one target tag.</h3>
        </div>

        <form action={mergeTagsAction} className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
          <label className="space-y-2">
            <span className="text-sm font-medium text-white/70">Source tag</span>
            <select
              name="sourceTagId"
              className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-white outline-none transition focus:border-white/30 focus:ring-2 focus:ring-white/10"
              defaultValue=""
            >
              <option value="" disabled>
                Select source
              </option>
              {tags.map((tag) => (
                <option key={tag.id} value={tag.id}>
                  {tag.name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-white/70">Target tag</span>
            <select
              name="targetTagId"
              className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-white outline-none transition focus:border-white/30 focus:ring-2 focus:ring-white/10"
              defaultValue=""
            >
              <option value="" disabled>
                Select target
              </option>
              {tags.map((tag) => (
                <option key={tag.id} value={tag.id}>
                  {tag.name}
                </option>
              ))}
            </select>
          </label>

          <button
            type="submit"
            className="self-end rounded-2xl border border-border px-5 py-3 text-sm font-semibold text-white/70 transition hover:border-white/50 hover:text-white"
          >
            Merge tags
          </button>
        </form>
      </section>
    </div>
  );
}

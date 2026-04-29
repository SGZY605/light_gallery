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
    <div className="space-y-4">
      <section>
        <h2 className="text-base font-semibold text-white/40">标签</h2>
      </section>

      <section className="border-t border-white/[0.04] pt-4">
        <div className="space-y-2">
          {tags.map((tag) => (
            <form
              key={tag.id}
              action={renameTagAction}
              className="flex flex-wrap items-end gap-2 p-1 border-b border-white/[0.02]"
            >
              <input type="hidden" name="tagId" value={tag.id} />
              <label className="flex-1 min-w-0 space-y-0.5">
                <span className="text-[10px] text-white/20">标签名称</span>
                <input
                  name="name"
                  defaultValue={tag.name}
                  className="w-full bg-transparent py-1 text-xs text-white/50 placeholder:text-white/15 outline-none border-b border-white/[0.04] transition focus:border-white/10"
                />
              </label>
              <div className="text-center">
                <span className="text-[10px] text-white/20">图片</span>
                <p className="text-xs font-medium text-white/30">
                  {tag._count.images}
                </p>
              </div>
              <div className="text-center">
                <span className="text-[10px] text-white/20">分享</span>
                <p className="text-xs font-medium text-white/30">
                  {tag._count.shares}
                </p>
              </div>
              <button
                type="submit"
                className="px-2 py-1 text-[10px] font-medium text-white/30 transition hover:text-white/50"
              >
                重命名
              </button>
            </form>
          ))}
        </div>
      </section>

      <section className="border-t border-white/[0.04] pt-4">
        <div className="max-w-2xl">
          <h3 className="text-sm font-semibold text-white/30">合并标签</h3>
        </div>

        <form action={mergeTagsAction} className="mt-3 flex flex-wrap items-end gap-2">
          <label className="space-y-0.5">
            <span className="text-[10px] text-white/20">源标签</span>
            <select
              name="sourceTagId"
              className="bg-transparent py-1 text-xs text-white/50 outline-none border-b border-white/[0.04] transition focus:border-white/10"
              defaultValue=""
            >
              <option value="" disabled>
                选择源标签
              </option>
              {tags.map((tag) => (
                <option key={tag.id} value={tag.id}>
                  {tag.name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-0.5">
            <span className="text-[10px] text-white/20">目标标签</span>
            <select
              name="targetTagId"
              className="bg-transparent py-1 text-xs text-white/50 outline-none border-b border-white/[0.04] transition focus:border-white/10"
              defaultValue=""
            >
              <option value="" disabled>
                选择目标标签
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
            className="px-2 py-1 text-[10px] font-medium text-white/30 transition hover:text-white/50"
          >
            合并标签
          </button>
        </form>
      </section>
    </div>
  );
}

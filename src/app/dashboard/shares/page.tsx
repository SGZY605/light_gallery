import { revalidatePath } from "next/cache";
import { CopyShareButton } from "@/components/copy-share-button";
import { DeleteShareButton } from "@/components/delete-share-button";
import { SharePhotoSelector } from "@/components/share-photo-selector";
import { canRevokeShare } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { filterImagesExistingInOss } from "@/lib/images/sync";
import { resolveUserOssConfig } from "@/lib/oss/user-config";
import { createShareToken, getShareState } from "@/lib/shares/tokens";

export const dynamic = "force-dynamic";

type DashboardSharesPageProps = {
  searchParams?: Promise<{
    title?: string | string[];
    description?: string | string[];
    imageId?: string | string[];
  }>;
};

function asSingleValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function asArray(value: string | string[] | undefined): string[] {
  return Array.isArray(value) ? value.filter(Boolean) : value ? [value] : [];
}

async function createShareAction(formData: FormData) {
  "use server";

  const user = await requireUser();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const tagIds = Array.from(new Set(formData.getAll("tagIds").map((value) => String(value)).filter(Boolean)));
  const imageIds = Array.from(new Set(formData.getAll("imageIds").map((value) => String(value)).filter(Boolean)));
  const expiresAtValue = String(formData.get("expiresAt") ?? "").trim();
  const allowDownload = formData.get("allowDownload") === "on";

  if (!title || !imageIds.length) {
    return;
  }

  const uniqueImageIds = Array.from(new Set(imageIds));
  const existingImages = await db.image.findMany({
    where: {
      uploaderId: user.id,
      deletedAt: null,
      id: {
        in: uniqueImageIds
      }
    },
    select: {
      id: true
    }
  });

  if (existingImages.length !== uniqueImageIds.length) {
    return;
  }

  const uniqueTagIds = Array.from(new Set(tagIds));
  const existingTags = uniqueTagIds.length
    ? await db.tag.findMany({
        where: {
          creatorId: user.id,
          id: {
            in: uniqueTagIds
          }
        },
        select: {
          id: true
        }
      })
    : [];

  if (existingTags.length !== uniqueTagIds.length) {
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
      images: {
        create: uniqueImageIds.map((imageId) => ({
          imageId
        }))
      },
      tags: {
        create: uniqueTagIds.map((tagId) => ({
          tagId
        }))
      }
    }
  });

  revalidatePath("/dashboard/shares");
}

async function deleteShareAction(formData: FormData) {
  "use server";

  const user = await requireUser();
  const shareId = String(formData.get("shareId") ?? "");

  if (!shareId) {
    return;
  }

  const share = await db.share.findFirst({
    where: {
      creatorId: user.id,
      id: shareId
    }
  });

  if (!share) {
    return;
  }

  const shareState = getShareState(share);

  if (shareState !== "active") {
    await db.share.delete({
      where: {
        id: share.id
      }
    });
  }

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
      creatorId: user.id,
      id: shareId
    },
    data: {
      revoked: true,
      revokedAt: new Date()
    }
  });

  revalidatePath("/dashboard/shares");
}

export default async function DashboardSharesPage({ searchParams }: DashboardSharesPageProps) {
  const user = await requireUser();
  const ossConfig = await resolveUserOssConfig({ user });
  const resolvedSearchParams = (await searchParams) ?? {};
  const initialTitle = asSingleValue(resolvedSearchParams.title);
  const initialDescription = asSingleValue(resolvedSearchParams.description);
  const initialSelectedImageIds = Array.from(new Set(asArray(resolvedSearchParams.imageId)));
  const [tags, images, shares] = await Promise.all([
    db.tag.findMany({
      where: {
        creatorId: user.id
      },
      orderBy: {
        name: "asc"
      }
    }),
    db.image.findMany({
      where: {
        deletedAt: null,
        uploaderId: user.id
      },
      orderBy: {
        createdAt: "desc"
      },
      include: {
        tags: {
          include: {
            tag: true
          },
          where: {
            tag: {
              creatorId: user.id
            }
          }
        }
      }
    }),
    db.share.findMany({
      where: {
        creatorId: user.id
      },
      orderBy: {
        createdAt: "desc"
      },
      include: {
        creator: true,
        images: {
          select: {
            imageId: true
          }
        },
        tags: {
          include: {
            tag: true
          },
          where: {
            tag: {
              creatorId: user.id
            }
          }
        }
      }
    })
  ]);
  const visibleImages = ossConfig
    ? await filterImagesExistingInOss({
        config: ossConfig,
        images,
        userId: user.id
      })
    : images;

  return (
    <div className="space-y-4">
      <section>
        <h2 className="text-base font-semibold text-white/40">分享</h2>
      </section>

      <section className="border-t border-white/[0.04] pt-4">
        <div className="max-w-2xl">
          <h3 className="text-sm font-semibold text-white/30">创建分享</h3>
        </div>

        <form action={createShareAction} className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_240px]">
          <div className="space-y-2">
            <label className="block space-y-0.5">
              <span className="text-[10px] text-white/20">标题</span>
              <input
                name="title"
                defaultValue={initialTitle}
                className="w-full bg-transparent py-1 text-xs text-white/50 placeholder:text-white/15 outline-none border-b border-white/[0.04] transition focus:border-white/10"
                placeholder="家庭旅行精选"
              />
            </label>

            <label className="block space-y-0.5">
              <span className="text-[10px] text-white/20">描述</span>
              <textarea
                name="description"
                rows={2}
                defaultValue={initialDescription}
                className="w-full bg-transparent py-1 text-xs text-white/50 placeholder:text-white/15 outline-none border-b border-white/[0.04] transition focus:border-white/10 resize-none"
                placeholder="可选说明"
              />
            </label>

            {ossConfig ? (
              <SharePhotoSelector
                images={visibleImages.map((image) => ({
                  id: image.id,
                  objectKey: image.objectKey,
                  filename: image.filename,
                  tags: image.tags.map(({ tag }) => ({
                    id: tag.id,
                    name: tag.name,
                    slug: tag.slug,
                    color: tag.color
                  }))
                }))}
                initialSelectedImageIds={initialSelectedImageIds}
                publicBaseUrl={ossConfig.publicBaseUrl}
                tags={tags.map((tag) => ({
                  id: tag.id,
                  name: tag.name
                }))}
              />
            ) : null}
          </div>

          <div className="space-y-2 border-l border-white/[0.04] pl-4">
            <label className="block space-y-0.5">
              <span className="text-[10px] text-white/20">过期时间</span>
              <input
                name="expiresAt"
                type="datetime-local"
                className="w-full bg-transparent py-1 text-xs text-white/50 outline-none border-b border-white/[0.04] transition focus:border-white/10"
              />
            </label>

            <label className="inline-flex items-center gap-1.5 text-[10px] text-white/30">
              <input type="checkbox" name="allowDownload" className="h-3 w-3 opacity-50" />
              <span>允许下载</span>
            </label>

            <button
              type="submit"
              disabled={!ossConfig}
              className="w-full px-3 py-1 text-xs font-medium text-white/30 transition hover:text-white/50"
            >
              创建分享
            </button>
          </div>
        </form>
      </section>

      <section className="border-t border-white/[0.04] pt-4">
        <div className="pb-3">
          <h3 className="text-sm font-semibold text-white/30">分享链接</h3>
        </div>

        <div className="space-y-2">
          {shares.length ? (
            shares.map((share) => {
              const shareState = getShareState(share);

              return (
                <article
                  key={share.id}
                  className="border-b border-white/[0.02] pb-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-medium text-white/40">{share.title}</h4>
                        <span
                          className={[
                            "px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.1em]",
                            shareState === "active"
                              ? "text-emerald-400/50"
                              : shareState === "expired"
                                ? "text-amber-400/50"
                                : "text-red-400/50"
                          ].join(" ")}
                        >
                            {shareState === "active" ? "正常" : shareState === "expired" ? "已过期" : "已撤销"}
                        </span>
                      </div>
                      {share.description ? <p className="text-[10px] leading-4 text-white/25">{share.description}</p> : null}

                      <p className="text-[10px] text-white/15">
                        /s/{share.token} • {share.creator.name}
                        {share.images.length ? ` · ${share.images.length} 张照片` : ""}
                        {share.expiresAt
                          ? ` · 过期于 ${new Intl.DateTimeFormat("zh-CN", {
                              dateStyle: "medium",
                              timeStyle: "short"
                            }).format(share.expiresAt)}`
                          : ""}
                      </p>

                      <div className="flex flex-wrap gap-1">
                        {share.tags.map(({ tag }) => (
                          <span
                            key={tag.id}
                            className="text-[10px] text-white/20"
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
                            className="px-2 py-0.5 text-[10px] text-red-400/50 transition hover:text-red-400/80"
                          >
                            撤销
                          </button>
                        </form>
                      ) : null}
                      {shareState !== "active" ? (
                        <DeleteShareButton
                          shareId={share.id}
                          shareTitle={share.title}
                          serverAction={deleteShareAction}
                        />
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="py-8 text-center text-[10px] text-white/15">
              尚未创建任何分享链接。
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

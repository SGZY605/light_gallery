import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getImagesForShare } from "@/lib/shares/query";

const projectRoot = process.cwd();
const shareFindUniqueMock = vi.fn();
const imageFindManyMock = vi.fn();

function readProjectFile(path: string): string {
  return readFileSync(join(projectRoot, path), "utf8");
}

function expectSourceToMatch(content: string, pattern: RegExp) {
  expect(content.replace(/\s+/g, " ")).toMatch(pattern);
}

describe("getImagesForShare", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns non-deleted creator-owned images explicitly attached to the share", async () => {
    shareFindUniqueMock.mockResolvedValue({
      id: "share-1",
      creatorId: "user-1",
      images: [{ imageId: "image-1" }, { imageId: "image-2" }]
    });
    imageFindManyMock.mockResolvedValue([{ id: "image-1" }]);

    const result = await getImagesForShare("share-1", {
      share: {
        findUnique: shareFindUniqueMock
      },
      image: {
        findMany: imageFindManyMock
      }
    } as never);

    expect(shareFindUniqueMock).toHaveBeenCalledWith({
      where: {
        id: "share-1"
      },
      include: {
        images: {
          select: {
            imageId: true
          }
        }
      }
    });
    expect(imageFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          deletedAt: null,
          uploaderId: "user-1",
          id: {
            in: ["image-1", "image-2"]
          }
        }
      })
    );
    expect(result).toEqual([{ id: "image-1" }]);
  });

  it("returns no images when a share has no attached images", async () => {
    shareFindUniqueMock.mockResolvedValue({
      id: "share-1",
      creatorId: "user-1",
      images: []
    });

    const result = await getImagesForShare("share-1", {
      share: {
        findUnique: shareFindUniqueMock
      },
      image: {
        findMany: imageFindManyMock
      }
    } as never);

    expect(result).toEqual([]);
    expect(imageFindManyMock).not.toHaveBeenCalled();
  });

  it("keeps share dashboard and API routes scoped to the current user", () => {
    const tagsPage = readProjectFile("src/app/dashboard/tags/page.tsx");
    expect(tagsPage).toContain("const user = await requireUser()");
    expect(tagsPage).toContain("creatorId: user.id");
    expect(tagsPage).toContain("image: { uploaderId: user.id }");
    expect(tagsPage).toContain("share: { creatorId: user.id }");

    const sharesPage = readProjectFile("src/app/dashboard/shares/page.tsx");
    expect(sharesPage).toContain("creatorId: user.id");
    expectSourceToMatch(sharesPage, /creatorId: user\.id,\s*id: shareId/);
    expect(sharesPage).toContain("existingTags.length !== uniqueTagIds.length");
    expect(sharesPage).toContain('formData.getAll("imageIds")');
    expect(sharesPage).toContain("existingImages.length !== uniqueImageIds.length");
    expect(sharesPage).toContain("images: {");
    expect(sharesPage).toContain("deleteShareAction");
    expect(sharesPage).toContain('shareState !== "active"');
    expect(sharesPage).toContain("SharePhotoSelector");
    expect(sharesPage).toContain("resolveUserOssConfig");
    expect(sharesPage).toContain("db.image.findMany");

    const sharePhotoSelector = readProjectFile("src/components/share-photo-selector.tsx");
    expect(sharePhotoSelector).toContain('name="imageIds"');
    expect(sharePhotoSelector).toContain("filterShareSelectionImages");
    expect(sharePhotoSelector).toContain("selectVisibleShareImages");
    expect(sharePhotoSelector).toContain("deselectVisibleShareImages");
    expect(sharePhotoSelector).toContain("toggleShareSelection");
    expect(sharePhotoSelector).toContain("保存");
    expect(sharePhotoSelector).toContain("取消全选");
    expect(sharePhotoSelector).toContain('aria-label="关闭"');
    expect(sharePhotoSelector).toContain("text-[color:var(--text-muted)]");
    expect(sharePhotoSelector).not.toContain("text-white/35");
    expect(sharePhotoSelector).not.toContain("标签筛选</p>");

    const sharesApi = readProjectFile("src/app/api/shares/route.ts");
    expect(sharesApi).toContain("creatorId: user.id");
    expect(sharesApi).toContain("imageIds");
    expectSourceToMatch(sharesApi, /uploaderId: user\.id,\s*deletedAt: null,\s*id: \{\s*in: uniqueImageIds\s*\}/);
    expect(sharesApi).toContain("existingImages.length !== uniqueImageIds.length");
    expect(sharesApi).toContain("images: {");
    expectSourceToMatch(sharesApi, /creatorId: user\.id,\s*id: \{\s*in: uniqueTagIds\s*\}/);

    const revokeApi = readProjectFile("src/app/api/shares/[id]/revoke/route.ts");
    expectSourceToMatch(revokeApi, /creatorId: user\.id,\s*id/);

    const deleteApi = readProjectFile("src/app/api/shares/[id]/route.ts");
    expect(deleteApi).toContain("getShareState");
    expect(deleteApi).toContain('shareState === "active"');
    expect(deleteApi).toContain("db.share.delete");
    expectSourceToMatch(deleteApi, /creatorId: user\.id,\s*id/);

    const publicSharePage = readProjectFile("src/app/s/[token]/page.tsx");
    expect(publicSharePage).toContain("resolveUserOssConfig");
    expect(publicSharePage).toContain("user: share.creator");
  });
});

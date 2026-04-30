import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildShareImageWhere, getImagesForShare } from "@/lib/shares/query";

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

  it("returns non-deleted images containing every selected tag in all-match mode", async () => {
    shareFindUniqueMock.mockResolvedValue({
      id: "share-1",
      creatorId: "user-1",
      matchMode: "ALL",
      tags: [{ tagId: "tag-1" }, { tagId: "tag-2" }]
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
        tags: true
      }
    });
    expect(imageFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          deletedAt: null,
          uploaderId: "user-1",
          AND: [
            {
              tags: {
                some: {
                  tagId: "tag-1"
                }
              }
            },
            {
              tags: {
                some: {
                  tagId: "tag-2"
                }
              }
            }
          ]
        }
      })
    );
    expect(result).toEqual([{ id: "image-1" }]);
  });

  it("builds any-match queries when configured", () => {
    expect(
      buildShareImageWhere({
        id: "share-1",
        creatorId: "user-1",
        matchMode: "ANY",
        tags: [{ tagId: "tag-1" }, { tagId: "tag-2" }]
      })
    ).toEqual({
      deletedAt: null,
      uploaderId: "user-1",
      tags: {
        some: {
          tagId: {
            in: ["tag-1", "tag-2"]
          }
        }
      }
    });
  });

  it("limits untagged shares to images uploaded by the share creator", () => {
    expect(
      buildShareImageWhere({
        id: "share-1",
        creatorId: "user-1",
        matchMode: "ALL",
        tags: []
      })
    ).toEqual({
      deletedAt: null,
      uploaderId: "user-1"
    });
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

    const sharesApi = readProjectFile("src/app/api/shares/route.ts");
    expect(sharesApi).toContain("creatorId: user.id");
    expectSourceToMatch(sharesApi, /creatorId: user\.id,\s*id: \{\s*in: uniqueTagIds\s*\}/);

    const revokeApi = readProjectFile("src/app/api/shares/[id]/revoke/route.ts");
    expectSourceToMatch(revokeApi, /creatorId: user\.id,\s*id/);

    const publicSharePage = readProjectFile("src/app/s/[token]/page.tsx");
    expect(publicSharePage).toContain("resolveUserOssConfig");
    expect(publicSharePage).toContain("user: share.creator");
  });
});

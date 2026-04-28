import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildShareImageWhere, getImagesForShare } from "@/lib/shares/query";

const shareFindUniqueMock = vi.fn();
const imageFindManyMock = vi.fn();

describe("getImagesForShare", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns non-deleted images containing every selected tag in all-match mode", async () => {
    shareFindUniqueMock.mockResolvedValue({
      id: "share-1",
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
        matchMode: "ANY",
        tags: [{ tagId: "tag-1" }, { tagId: "tag-2" }]
      })
    ).toEqual({
      deletedAt: null,
      tags: {
        some: {
          tagId: {
            in: ["tag-1", "tag-2"]
          }
        }
      }
    });
  });
});

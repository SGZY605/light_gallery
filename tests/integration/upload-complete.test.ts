import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUser = vi.fn();
const transactionMock = vi.fn();
const tagFindManyMock = vi.fn();
const tagUpsertMock = vi.fn();
const imageCreateMock = vi.fn();
const uploadItemUpdateManyMock = vi.fn();
const auditLogCreateMock = vi.fn();

vi.mock("@/lib/auth/session", () => ({
  getCurrentUser
}));

vi.mock("@/lib/db", () => ({
  db: {
    $transaction: transactionMock
  }
}));

describe("POST /api/uploads/complete", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    getCurrentUser.mockResolvedValue({
      id: "user-1",
      role: "OWNER"
    });

    transactionMock.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({
        tag: {
          findMany: tagFindManyMock,
          upsert: tagUpsertMock
        },
        image: {
          create: imageCreateMock
        },
        uploadItem: {
          updateMany: uploadItemUpdateManyMock
        },
        auditLog: {
          create: auditLogCreateMock
        }
      })
    );

    tagFindManyMock.mockResolvedValue([
      {
        id: "tag-1",
        name: "family",
        slug: "family"
      }
    ]);
    tagUpsertMock.mockResolvedValue({
      id: "tag-2",
      name: "Travel",
      slug: "travel"
    });
    imageCreateMock.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      id: "image-1",
      objectKey: data.objectKey,
      filename: data.filename,
      width: data.width ?? null,
      height: data.height ?? null,
      exif: null,
      tags: [
        { tag: { id: "tag-1", name: "family", slug: "family" } },
        { tag: { id: "tag-2", name: "Travel", slug: "travel" } }
      ]
    }));
    uploadItemUpdateManyMock.mockResolvedValue({ count: 1 });
    auditLogCreateMock.mockResolvedValue({ id: "audit-1" });
  });

  it("creates image, exif, tags, and audit log", async () => {
    const { POST } = await import("@/app/api/uploads/complete/route");

    const response = await POST(
      new Request("http://localhost/api/uploads/complete", {
        method: "POST",
        body: JSON.stringify({
          objectKey: "uploads/2026/04/demo.jpg",
          filename: "demo.jpg",
          mimeType: "image/jpeg",
          sizeBytes: 1024,
          width: 1600,
          height: 1200,
          exif: {
            Make: "FUJIFILM",
            Model: "X100V",
            latitude: 31.2304,
            longitude: 121.4737
          },
          tagIds: ["tag-1"],
          tagNames: ["Travel"],
          uploadItemId: "upload-item-1"
        }),
        headers: {
          "Content-Type": "application/json"
        }
      })
    );

    const result = (await response.json()) as {
      image: { id: string; tags: Array<{ id: string; slug: string }> };
    };

    expect(response.status).toBe(200);
    expect(tagFindManyMock).toHaveBeenCalledWith({
      where: {
        id: {
          in: ["tag-1"]
        }
      }
    });
    expect(tagUpsertMock).toHaveBeenCalledWith({
      where: { slug: "travel" },
      update: { name: "Travel" },
      create: {
        name: "Travel",
        slug: "travel",
        creatorId: "user-1"
      }
    });
    expect(imageCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          objectKey: "uploads/2026/04/demo.jpg",
          uploaderId: "user-1",
          tags: {
            create: [{ tagId: "tag-1" }, { tagId: "tag-2" }]
          },
          exif: {
            create: expect.objectContaining({
              cameraMake: "FUJIFILM",
              cameraModel: "X100V",
              latitude: 31.2304,
              longitude: 121.4737
            })
          }
        })
      })
    );
    expect(uploadItemUpdateManyMock).toHaveBeenCalledWith({
      where: {
        id: "upload-item-1"
      },
      data: {
        imageId: "image-1",
        objectKey: "uploads/2026/04/demo.jpg",
        status: "COMPLETE",
        errorMessage: null
      }
    });
    expect(auditLogCreateMock).toHaveBeenCalledWith({
      data: {
        actorId: "user-1",
        action: "UPLOAD_COMPLETED",
        entityType: "image",
        entityId: "image-1",
        metadata: {
          objectKey: "uploads/2026/04/demo.jpg",
          mimeType: "image/jpeg",
          sizeBytes: 1024,
          tagIds: ["tag-1", "tag-2"]
        }
      }
    });
    expect(result.image.id).toBe("image-1");
    expect(result.image.tags).toEqual([
      { id: "tag-1", name: "family", slug: "family" },
      { id: "tag-2", name: "Travel", slug: "travel" }
    ]);
  });
});

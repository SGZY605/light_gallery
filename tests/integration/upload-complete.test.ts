import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUser = vi.fn();
const transactionMock = vi.fn();
const tagFindManyMock = vi.fn();
const tagUpsertMock = vi.fn();
const imageCreateMock = vi.fn();
const uploadItemUpdateManyMock = vi.fn();
const auditLogCreateMock = vi.fn();
const resolveUserOssConfig = vi.fn();

const ossConfig = {
  accessKeyId: "access-key-id",
  accessKeySecret: "access-key-secret",
  allowedMimePrefix: "image/",
  bucket: "gallery-sgzy",
  maxUploadBytes: 5 * 1024 * 1024,
  policyExpiresSeconds: 300,
  publicBaseUrl: "https://gallery-sgzy.oss-cn-beijing.aliyuncs.com",
  region: "cn-beijing",
  uploadBaseUrl: "https://gallery-sgzy.oss-cn-beijing.aliyuncs.com",
  uploadPrefix: "uploads"
};

vi.mock("@/lib/auth/session", () => ({
  getCurrentUser
}));

vi.mock("@/lib/db", () => ({
  db: {
    $transaction: transactionMock
  }
}));

vi.mock("@/lib/oss/user-config", () => ({
  resolveUserOssConfig
}));

describe("POST /api/uploads/complete", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    getCurrentUser.mockResolvedValue({
      email: "user@example.com",
      id: "user-1",
      role: "ADMIN"
    });
    resolveUserOssConfig.mockResolvedValue(ossConfig);

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
    expect(resolveUserOssConfig).toHaveBeenCalledWith({
      user: expect.objectContaining({
        id: "user-1"
      })
    });
    expect(tagFindManyMock).toHaveBeenCalledWith({
      where: {
        creatorId: "user-1",
        id: {
          in: ["tag-1"]
        }
      }
    });
    expect(tagUpsertMock).toHaveBeenCalledWith({
      where: { creatorId_slug: { creatorId: "user-1", slug: "travel" } },
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
        id: "upload-item-1",
        session: {
          creatorId: "user-1"
        }
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

  it("rejects completion when the user has no usable OSS config", async () => {
    resolveUserOssConfig.mockResolvedValue(null);
    const { POST } = await import("@/app/api/uploads/complete/route");

    const response = await POST(
      new Request("http://localhost/api/uploads/complete", {
        method: "POST",
        body: JSON.stringify({
          objectKey: "uploads/2026/04/demo.jpg",
          filename: "demo.jpg",
          mimeType: "image/jpeg",
          sizeBytes: 1024
        }),
        headers: {
          "Content-Type": "application/json"
        }
      })
    );

    expect(response.status).toBe(428);
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("rejects tag ids that do not belong to the current user", async () => {
    tagFindManyMock.mockResolvedValue([]);
    const { POST } = await import("@/app/api/uploads/complete/route");

    const response = await POST(
      new Request("http://localhost/api/uploads/complete", {
        method: "POST",
        body: JSON.stringify({
          objectKey: "uploads/2026/04/demo.jpg",
          filename: "demo.jpg",
          mimeType: "image/jpeg",
          sizeBytes: 1024,
          tagIds: ["tag-1"]
        }),
        headers: {
          "Content-Type": "application/json"
        }
      })
    );

    expect(response.status).toBe(400);
    expect(imageCreateMock).not.toHaveBeenCalled();
  });
});

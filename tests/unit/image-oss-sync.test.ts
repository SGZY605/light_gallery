import { beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "@prisma/client";
import type { ResolvedOssConfig } from "@/lib/oss/user-config";

const imageFindManyMock = vi.fn();
const imageFindFirstMock = vi.fn();
const imageCreateMock = vi.fn();
const imageUpdateMock = vi.fn();
const imageUpdateManyMock = vi.fn();
const auditLogCreateMock = vi.fn();
const resolveUserOssConfigMock = vi.fn();
const listOssObjectsMock = vi.fn();
const headOssObjectMock = vi.fn();
const deleteOssObjectMock = vi.fn();

const user = {
  email: "member@example.com",
  id: "user-1",
  name: "Member",
  role: "MEMBER"
} as User;

const config: ResolvedOssConfig = {
  accessKeyId: "access-key",
  accessKeySecret: "secret",
  allowedMimePrefix: "image/",
  bucket: "gallery",
  maxUploadBytes: 25 * 1024 * 1024,
  metadataPrefix: "metadata",
  policyExpiresSeconds: 300,
  publicBaseUrl: "https://cdn.example.com",
  region: "cn-shanghai",
  uploadBaseUrl: "https://gallery.oss-cn-shanghai.aliyuncs.com",
  uploadPrefix: "uploads"
};

vi.mock("@/lib/db", () => ({
  db: {
    image: {
      findMany: imageFindManyMock,
      findFirst: imageFindFirstMock,
      create: imageCreateMock,
      update: imageUpdateMock,
      updateMany: imageUpdateManyMock
    },
    auditLog: {
      create: auditLogCreateMock
    }
  }
}));

vi.mock("@/lib/oss/user-config", () => ({
  resolveUserOssConfig: resolveUserOssConfigMock
}));

vi.mock("@/lib/oss/client", () => ({
  deleteOssObject: deleteOssObjectMock,
  headOssObject: headOssObjectMock,
  listOssObjects: listOssObjectsMock
}));

vi.mock("@/lib/images/metadata-sync", () => ({
  deleteMetadataSidecar: vi.fn().mockResolvedValue(undefined)
}));

describe("image OSS synchronization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveUserOssConfigMock.mockResolvedValue(config);
    auditLogCreateMock.mockResolvedValue({ id: "audit-1" });
  });

  it("soft deletes active local records whose OSS objects no longer exist", async () => {
    imageFindManyMock.mockResolvedValue([
      {
        id: "image-1",
        objectKey: "uploads/2026/04/local-only.jpg",
        deletedAt: null
      }
    ]);
    listOssObjectsMock.mockResolvedValue([]);
    imageUpdateManyMock.mockResolvedValue({ count: 1 });
    const { syncUserImagesWithOss } = await import("@/lib/images/sync");

    const result = await syncUserImagesWithOss(user);

    expect(imageUpdateManyMock).toHaveBeenCalledWith({
      where: {
        id: {
          in: ["image-1"]
        },
        uploaderId: "user-1"
      },
      data: {
        deletedAt: expect.any(Date)
      }
    });
    expect(result.deletedLocalRecords).toBe(1);
    expect(result.importedOssObjects).toBe(0);
  });

  it("imports OSS image objects that have no local image record", async () => {
    imageFindManyMock.mockResolvedValue([]);
    listOssObjectsMock.mockResolvedValue([
      {
        key: "uploads/2026/04/cloud-only.jpg",
        lastModified: new Date("2026-04-30T08:00:00.000Z"),
        size: 4096
      }
    ]);
    imageCreateMock.mockResolvedValue({ id: "image-2" });
    const { syncUserImagesWithOss } = await import("@/lib/images/sync");

    const result = await syncUserImagesWithOss(user);

    expect(imageCreateMock).toHaveBeenCalledWith({
      data: {
        createdAt: new Date("2026-04-30T08:00:00.000Z"),
        filename: "cloud-only.jpg",
        mimeType: "image/jpeg",
        objectKey: "uploads/2026/04/cloud-only.jpg",
        sizeBytes: 4096,
        uploaderId: "user-1"
      }
    });
    expect(result.importedOssObjects).toBe(1);
  });

  it("restores a soft-deleted local record when the OSS object exists", async () => {
    imageFindManyMock.mockResolvedValue([
      {
        id: "image-3",
        objectKey: "uploads/2026/04/restored.png",
        deletedAt: new Date("2026-04-29T00:00:00.000Z")
      }
    ]);
    listOssObjectsMock.mockResolvedValue([
      {
        key: "uploads/2026/04/restored.png",
        lastModified: new Date("2026-04-30T08:00:00.000Z"),
        size: 8192
      }
    ]);
    imageUpdateMock.mockResolvedValue({ id: "image-3" });
    const { syncUserImagesWithOss } = await import("@/lib/images/sync");

    const result = await syncUserImagesWithOss(user);

    expect(imageUpdateMock).toHaveBeenCalledWith({
      where: {
        id: "image-3"
      },
      data: {
        deletedAt: null,
        sizeBytes: 8192
      }
    });
    expect(result.restoredLocalRecords).toBe(1);
  });

  it("deletes an owned image from OSS before marking the local record deleted", async () => {
    imageFindFirstMock.mockResolvedValue({
      id: "image-4",
      objectKey: "uploads/2026/04/delete-me.jpg",
      deletedAt: null
    });
    deleteOssObjectMock.mockResolvedValue(undefined);
    imageUpdateMock.mockResolvedValue({ id: "image-4" });
    const { deleteOwnedImageEverywhere } = await import("@/lib/images/sync");

    const result = await deleteOwnedImageEverywhere({
      imageId: "image-4",
      user
    });

    expect(result).toEqual({ deleted: true });
    expect(deleteOssObjectMock).toHaveBeenCalledWith(config, "uploads/2026/04/delete-me.jpg");
    const { deleteMetadataSidecar } = await import("@/lib/images/metadata-sync");
    expect(deleteMetadataSidecar).toHaveBeenCalledWith(config, "uploads/2026/04/delete-me.jpg");
    expect(imageUpdateMock).toHaveBeenCalledWith({
      where: {
        id: "image-4"
      },
      data: {
        deletedAt: expect.any(Date)
      }
    });
  });

  it("does not mark the local record deleted when OSS deletion fails", async () => {
    imageFindFirstMock.mockResolvedValue({
      id: "image-5",
      objectKey: "uploads/2026/04/fail.jpg",
      deletedAt: null
    });
    deleteOssObjectMock.mockRejectedValue(new Error("OSS DELETE object failed with status 403"));
    const { deleteOwnedImageEverywhere } = await import("@/lib/images/sync");

    await expect(
      deleteOwnedImageEverywhere({
        imageId: "image-5",
        user
      })
    ).rejects.toThrow("OSS DELETE object failed");
    expect(imageUpdateMock).not.toHaveBeenCalled();
  });

  it("filters visible local images that no longer exist in OSS and soft deletes them", async () => {
    headOssObjectMock
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);
    imageUpdateManyMock.mockResolvedValue({ count: 1 });
    const { filterImagesExistingInOss } = await import("@/lib/images/sync");

    const result = await filterImagesExistingInOss({
      config,
      images: [
        { id: "image-6", objectKey: "uploads/2026/04/existing.jpg", filename: "existing.jpg" },
        { id: "image-7", objectKey: "uploads/2026/04/missing.jpg", filename: "missing.jpg" }
      ],
      userId: "user-1"
    });

    expect(result).toEqual([
      { id: "image-6", objectKey: "uploads/2026/04/existing.jpg", filename: "existing.jpg" }
    ]);
    expect(imageUpdateManyMock).toHaveBeenCalledWith({
      where: {
        id: {
          in: ["image-7"]
        },
        uploaderId: "user-1"
      },
      data: {
        deletedAt: expect.any(Date)
      }
    });
  });
});

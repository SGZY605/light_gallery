import { beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "@prisma/client";
import type { ResolvedOssConfig } from "@/lib/oss/user-config";

const imageFindManyMock = vi.fn();
const imageUpdateMock = vi.fn();
const tagFindUniqueMock = vi.fn();
const tagCreateMock = vi.fn();
const txTagFindUniqueMock = vi.fn();
const txTagCreateMock = vi.fn();
const txTagUpsertMock = vi.fn();
const imageTagCreateManyMock = vi.fn();
const imageTagDeleteManyMock = vi.fn();
const imageExifUpsertMock = vi.fn();
const locationUpsertMock = vi.fn();
const locationDeleteManyMock = vi.fn();
const dbTransactionMock = vi.fn();
const auditLogCreateMock = vi.fn();
const resolveUserOssConfigMock = vi.fn();
const putOssObjectMock = vi.fn();
const getOssObjectMock = vi.fn();
const headOssObjectMock = vi.fn();
const listOssObjectsMock = vi.fn();
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
      update: imageUpdateMock
    },
    imageExif: {
      upsert: imageExifUpsertMock
    },
    imageTag: {
      createMany: imageTagCreateManyMock,
      deleteMany: imageTagDeleteManyMock
    },
    tag: {
      create: tagCreateMock,
      findUnique: tagFindUniqueMock
    },
    imageLocationOverride: {
      deleteMany: locationDeleteManyMock,
      upsert: locationUpsertMock
    },
    $transaction: dbTransactionMock,
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
  getOssObject: getOssObjectMock,
  headOssObject: headOssObjectMock,
  listOssObjects: listOssObjectsMock,
  putOssObject: putOssObjectMock
}));

describe("metadata OSS synchronization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveUserOssConfigMock.mockResolvedValue(config);
    auditLogCreateMock.mockResolvedValue({ id: "audit-1" });
    txTagFindUniqueMock.mockResolvedValue(null);
    txTagCreateMock.mockImplementation(async ({ data }) => ({
      id: `tag-${String(data.slug).replace(/-tag$/, "")}`,
      ...data
    }));
    dbTransactionMock.mockImplementation(async (fn) =>
      fn({
        image: {
          update: imageUpdateMock
        },
        tag: {
          create: txTagCreateMock,
          findUnique: txTagFindUniqueMock,
          upsert: txTagUpsertMock
        },
        imageExif: {
          upsert: imageExifUpsertMock
        },
        imageLocationOverride: {
          deleteMany: locationDeleteManyMock,
          upsert: locationUpsertMock
        },
        imageTag: {
          createMany: imageTagCreateManyMock,
          deleteMany: imageTagDeleteManyMock
        }
      })
    );
  });

  it("exports local image metadata as JSON to OSS", async () => {
    imageFindManyMock.mockResolvedValue([
      {
        createdAt: new Date("2026-04-01"),
        deletedAt: null,
        description: "A sunset photo",
        exif: {
          cameraMake: "Canon",
          cameraModel: "EOS R5",
          exposureTime: "1/1000",
          fNumber: 2.8,
          focalLength: 50,
          height: 4000,
          iso: 100,
          latitude: 31.23,
          lensModel: "RF 50mm f/1.2",
          longitude: 121.47,
          orientation: 1,
          raw: {
            DateTimeOriginal: "2026:03:15 10:30:00",
            Make: "Canon",
            Model: "EOS R5"
          },
          width: 6000,
          takenAt: new Date("2026-03-15T10:30:00.000Z")
        },
        featured: true,
        height: 4000,
        id: "image-1",
        location: {
          label: "Shanghai",
          latitude: 31.23,
          longitude: 121.47
        },
        objectKey: "uploads/2026/04/sunset.jpg",
        tags: [
          { tag: { name: "nature" } },
          { tag: { name: "sunset" } }
        ],
        updatedAt: new Date("2026-04-30"),
        width: 6000
      }
    ]);
    getOssObjectMock.mockResolvedValue(null);
    putOssObjectMock.mockResolvedValue(undefined);

    const { syncUserMetadataWithOss } = await import("@/lib/images/metadata-sync");
    const result = await syncUserMetadataWithOss(user);

    expect(putOssObjectMock).toHaveBeenCalledWith(
      config,
      "metadata/uploads/2026/04/sunset.jpg.json",
      expect.any(String)
    );
    const putCall = putOssObjectMock.mock.calls[0];
    const metadataJson = JSON.parse(putCall[2]);
    expect(metadataJson.objectKey).toBe("uploads/2026/04/sunset.jpg");
    expect(metadataJson.description).toBe("A sunset photo");
    expect(metadataJson.featured).toBe(true);
    expect(metadataJson.tags).toEqual(["nature", "sunset"]);
    expect(metadataJson.location).toEqual({
      label: "Shanghai",
      latitude: 31.23,
      longitude: 121.47
    });
    expect(metadataJson.width).toBe(6000);
    expect(metadataJson.height).toBe(4000);
    expect(metadataJson.exif).toEqual({
      cameraMake: "Canon",
      cameraModel: "EOS R5",
      exposureTime: "1/1000",
      fNumber: 2.8,
      focalLength: 50,
      height: 4000,
      iso: 100,
      latitude: 31.23,
      lensModel: "RF 50mm f/1.2",
      longitude: 121.47,
      orientation: 1,
      raw: {
        DateTimeOriginal: "2026:03:15 10:30:00",
        Make: "Canon",
        Model: "EOS R5"
      },
      takenAt: "2026-03-15T10:30:00.000Z"
      ,
      width: 6000
    });
    expect(result.exportedCount).toBe(1);
    expect(result.importedCount).toBe(0);
  });

  it("imports metadata from OSS and updates local image", async () => {
    imageFindManyMock.mockResolvedValue([
      {
        createdAt: new Date("2026-04-01"),
        deletedAt: null,
        description: null,
        exif: null,
        featured: false,
        height: null,
        id: "image-2",
        location: null,
        objectKey: "uploads/2026/04/photo.jpg",
        tags: [],
        updatedAt: new Date("2026-04-01"),
        width: null
      }
    ]);
    getOssObjectMock.mockResolvedValue(
      JSON.stringify({
        description: "Imported description",
        exif: {
          cameraMake: "Sony",
          cameraModel: "A7R IV",
          exposureTime: "1/250",
          fNumber: 4,
          focalLength: 24,
          height: 3000,
          iso: 200,
          latitude: null,
          lensModel: "FE 24-70mm f/2.8 GM",
          longitude: null,
          orientation: 1,
          raw: {
            LensModel: "FE 24-70mm f/2.8 GM",
            Make: "Sony",
            Model: "A7R IV"
          },
          takenAt: "2026-03-20T14:00:00.000Z"
          ,
          width: 4000
        },
        featured: true,
        height: 3000,
        location: {
          label: "Beijing",
          latitude: 39.9,
          longitude: 116.4
        },
        objectKey: "uploads/2026/04/photo.jpg",
        syncedAt: "2026-04-30T00:00:00.000Z",
        tags: ["travel", "city"],
        width: 4000
      })
    );
    imageTagDeleteManyMock.mockResolvedValue({ count: 0 });
    imageTagCreateManyMock.mockResolvedValue({ count: 2 });
    locationUpsertMock.mockResolvedValue({});
    imageUpdateMock.mockResolvedValue({});
    imageExifUpsertMock.mockResolvedValue({});

    const { syncUserMetadataWithOss } = await import("@/lib/images/metadata-sync");
    const result = await syncUserMetadataWithOss(user);

    expect(result.importedCount).toBe(1);
    expect(result.exportedCount).toBe(0);
    expect(tagCreateMock).not.toHaveBeenCalled();
    expect(tagFindUniqueMock).not.toHaveBeenCalled();
    expect(txTagUpsertMock).not.toHaveBeenCalled();
    expect(txTagFindUniqueMock).toHaveBeenCalledWith({
      where: { creatorId_name: { creatorId: "user-1", name: "travel" } }
    });
    expect(txTagFindUniqueMock).toHaveBeenCalledWith({
      where: { creatorId_name: { creatorId: "user-1", name: "city" } }
    });
    expect(txTagCreateMock).toHaveBeenCalledWith({
      data: {
        creatorId: "user-1",
        name: "travel",
        slug: "travel"
      }
    });
    expect(txTagCreateMock).toHaveBeenCalledWith({
      data: {
        creatorId: "user-1",
        name: "city",
        slug: "city"
      }
    });
    expect(imageTagDeleteManyMock).toHaveBeenCalledWith({
      where: { imageId: "image-2" }
    });
    expect(imageTagCreateManyMock).toHaveBeenCalledWith({
      data: [
        { imageId: "image-2", tagId: "tag-travel" },
        { imageId: "image-2", tagId: "tag-city" }
      ],
      skipDuplicates: true
    });
    expect(locationUpsertMock).toHaveBeenCalledWith({
      create: {
        imageId: "image-2",
        label: "Beijing",
        latitude: 39.9,
        longitude: 116.4,
        source: "manual",
        updatedById: "user-1"
      },
      update: {
        label: "Beijing",
        latitude: 39.9,
        longitude: 116.4
      },
      where: { imageId: "image-2" }
    });
    // Verify description and featured are updated
    expect(imageUpdateMock).toHaveBeenCalledWith({
      where: { id: "image-2" },
      data: {
        description: "Imported description",
        featured: true
      }
    });
    // Verify dimensions are updated
    expect(imageUpdateMock).toHaveBeenCalledWith({
      where: { id: "image-2" },
      data: {
        height: 3000,
        width: 4000
      }
    });
    // Verify EXIF is imported
    expect(imageExifUpsertMock).toHaveBeenCalledWith({
      create: {
        cameraMake: "Sony",
        cameraModel: "A7R IV",
        exposureTime: "1/250",
        fNumber: 4,
        focalLength: 24,
        height: 3000,
        imageId: "image-2",
        iso: 200,
        latitude: null,
        lensModel: "FE 24-70mm f/2.8 GM",
        longitude: null,
        orientation: 1,
        raw: {
          LensModel: "FE 24-70mm f/2.8 GM",
          Make: "Sony",
          Model: "A7R IV"
        },
        takenAt: new Date("2026-03-20T14:00:00.000Z")
        ,
        width: 4000
      },
      update: {},
      where: { imageId: "image-2" }
    });
  });

  it("imports sidecar metadata for a newly imported OSS object even when the local row is newer", async () => {
    imageFindManyMock.mockResolvedValue([
      {
        createdAt: new Date("2026-05-01T00:00:00.000Z"),
        deletedAt: null,
        description: null,
        exif: null,
        featured: false,
        height: null,
        id: "image-new-local",
        location: null,
        objectKey: "uploads/2026/04/shared.jpg",
        tags: [],
        updatedAt: new Date("2026-05-01T00:00:00.000Z"),
        width: null
      }
    ]);
    getOssObjectMock.mockResolvedValue(
      JSON.stringify({
        description: "User 1 caption",
        exif: {
          cameraMake: "Nikon",
          cameraModel: "Z8",
          exposureTime: "1/500",
          fNumber: 5.6,
          focalLength: 70,
          height: 3712,
          iso: 400,
          latitude: null,
          lensModel: "NIKKOR Z 24-70mm",
          longitude: null,
          orientation: 1,
          raw: {
            DateTimeOriginal: "2026:04:20 08:00:00",
            Make: "Nikon",
            Model: "Z8"
          },
          takenAt: "2026-04-20T08:00:00.000Z",
          width: 5568
        },
        featured: true,
        height: 3712,
        location: {
          label: "Hangzhou",
          latitude: 30.2741,
          longitude: 120.1551
        },
        objectKey: "uploads/2026/04/shared.jpg",
        syncedAt: "2026-04-30T00:00:00.000Z",
        tags: ["shared", "camera"],
        width: 5568
      })
    );
    imageTagDeleteManyMock.mockResolvedValue({ count: 0 });
    imageTagCreateManyMock.mockResolvedValue({ count: 2 });
    locationUpsertMock.mockResolvedValue({});
    imageUpdateMock.mockResolvedValue({});
    imageExifUpsertMock.mockResolvedValue({});

    const { syncUserMetadataWithOss } = await import("@/lib/images/metadata-sync");
    const result = await syncUserMetadataWithOss(user);

    expect(result.exportedCount).toBe(1);
    expect(imageUpdateMock).toHaveBeenCalledWith({
      where: { id: "image-new-local" },
      data: {
        description: "User 1 caption",
        featured: true
      }
    });
    expect(imageTagCreateManyMock).toHaveBeenCalledWith({
      data: [
        { imageId: "image-new-local", tagId: "tag-shared" },
        { imageId: "image-new-local", tagId: "tag-camera" }
      ],
      skipDuplicates: true
    });
    expect(locationUpsertMock).toHaveBeenCalledWith({
      create: {
        imageId: "image-new-local",
        label: "Hangzhou",
        latitude: 30.2741,
        longitude: 120.1551,
        source: "manual",
        updatedById: "user-1"
      },
      update: {
        label: "Hangzhou",
        latitude: 30.2741,
        longitude: 120.1551
      },
      where: { imageId: "image-new-local" }
    });
    expect(imageExifUpsertMock).toHaveBeenCalledWith({
      create: expect.objectContaining({
        cameraMake: "Nikon",
        cameraModel: "Z8",
        height: 3712,
        imageId: "image-new-local",
        raw: {
          DateTimeOriginal: "2026:04:20 08:00:00",
          Make: "Nikon",
          Model: "Z8"
        },
        takenAt: new Date("2026-04-20T08:00:00.000Z"),
        width: 5568
      }),
      update: {},
      where: { imageId: "image-new-local" }
    });
  });

  it("normalizes imported tag names and slugs using the shared tag rules", async () => {
    imageFindManyMock.mockResolvedValue([
      {
        createdAt: new Date("2026-04-01"),
        deletedAt: null,
        description: null,
        exif: null,
        featured: false,
        height: null,
        id: "image-normalized-tags",
        location: null,
        objectKey: "uploads/2026/04/tags.jpg",
        tags: [],
        updatedAt: new Date("2026-04-01"),
        width: null
      }
    ]);
    getOssObjectMock.mockResolvedValue(
      JSON.stringify({
        description: null,
        exif: null,
        featured: false,
        height: null,
        location: null,
        objectKey: "uploads/2026/04/tags.jpg",
        syncedAt: "2026-04-30T00:00:00.000Z",
        tags: ["  Travel Photos  "],
        width: null
      })
    );
    imageTagDeleteManyMock.mockResolvedValue({ count: 0 });
    imageTagCreateManyMock.mockResolvedValue({ count: 1 });

    const { syncUserMetadataWithOss } = await import("@/lib/images/metadata-sync");
    await syncUserMetadataWithOss(user);

    expect(tagFindUniqueMock).not.toHaveBeenCalled();
    expect(tagCreateMock).not.toHaveBeenCalled();
    expect(txTagUpsertMock).not.toHaveBeenCalled();
    expect(txTagFindUniqueMock).toHaveBeenCalledWith({
      where: {
        creatorId_name: {
          creatorId: "user-1",
          name: "Travel Photos"
        }
      }
    });
    expect(txTagCreateMock).toHaveBeenCalledWith({
      data: {
        creatorId: "user-1",
        name: "Travel Photos",
        slug: "travel-photos"
      }
    });
  });

  it("reuses an existing local tag with the same name when its slug differs", async () => {
    imageFindManyMock.mockResolvedValue([
      {
        createdAt: new Date("2026-04-01"),
        deletedAt: null,
        description: null,
        exif: null,
        featured: false,
        height: null,
        id: "image-existing-tag-name",
        location: null,
        objectKey: "uploads/2026/04/existing-tag.jpg",
        tags: [],
        updatedAt: new Date("2026-04-01"),
        width: null
      }
    ]);
    getOssObjectMock.mockResolvedValue(
      JSON.stringify({
        description: null,
        exif: null,
        featured: false,
        height: null,
        location: null,
        objectKey: "uploads/2026/04/existing-tag.jpg",
        syncedAt: "2026-04-30T00:00:00.000Z",
        tags: ["Travel Photos"],
        width: null
      })
    );
    txTagFindUniqueMock.mockResolvedValueOnce({
      id: "tag-existing-name",
      name: "Travel Photos",
      slug: "old-travel-photos"
    });
    imageTagDeleteManyMock.mockResolvedValue({ count: 0 });
    imageTagCreateManyMock.mockResolvedValue({ count: 1 });

    const { syncUserMetadataWithOss } = await import("@/lib/images/metadata-sync");
    await syncUserMetadataWithOss(user);

    expect(txTagFindUniqueMock).toHaveBeenCalledWith({
      where: {
        creatorId_name: {
          creatorId: "user-1",
          name: "Travel Photos"
        }
      }
    });
    expect(txTagUpsertMock).not.toHaveBeenCalled();
    expect(txTagCreateMock).not.toHaveBeenCalled();
    expect(imageTagCreateManyMock).toHaveBeenCalledWith({
      data: [{ imageId: "image-existing-tag-name", tagId: "tag-existing-name" }],
      skipDuplicates: true
    });
  });

  it("creates imported tags with a suffixed slug when the generated slug is already used", async () => {
    imageFindManyMock.mockResolvedValue([
      {
        createdAt: new Date("2026-04-01"),
        deletedAt: null,
        description: null,
        exif: null,
        featured: false,
        height: null,
        id: "image-slug-conflict",
        location: null,
        objectKey: "uploads/2026/04/slug-conflict.jpg",
        tags: [],
        updatedAt: new Date("2026-04-01"),
        width: null
      }
    ]);
    getOssObjectMock.mockResolvedValue(
      JSON.stringify({
        description: null,
        exif: null,
        featured: false,
        height: null,
        location: null,
        objectKey: "uploads/2026/04/slug-conflict.jpg",
        syncedAt: "2026-04-30T00:00:00.000Z",
        tags: ["旅行"],
        width: null
      })
    );
    txTagFindUniqueMock.mockImplementation(async ({ where }) => {
      if ("creatorId_slug" in where && where.creatorId_slug.slug === "tag") {
        return {
          id: "tag-existing-slug",
          name: "已有中文标签",
          slug: "tag"
        };
      }

      return null;
    });
    imageTagDeleteManyMock.mockResolvedValue({ count: 0 });
    imageTagCreateManyMock.mockResolvedValue({ count: 1 });

    const { syncUserMetadataWithOss } = await import("@/lib/images/metadata-sync");
    await syncUserMetadataWithOss(user);

    expect(txTagCreateMock).toHaveBeenCalledWith({
      data: {
        creatorId: "user-1",
        name: "旅行",
        slug: "tag-2"
      }
    });
    expect(imageTagCreateManyMock).toHaveBeenCalledWith({
      data: [{ imageId: "image-slug-conflict", tagId: "tag-tag-2" }],
      skipDuplicates: true
    });
  });

  it("does field-level merge when timestamps are equal", async () => {
    const sameDate = new Date("2026-04-30T00:00:00.000Z");
    imageFindManyMock.mockResolvedValue([
      {
        createdAt: new Date("2026-04-01"),
        deletedAt: null,
        description: null,
        exif: null,
        featured: false,
        height: null,
        id: "image-3",
        location: null,
        objectKey: "uploads/2026/04/merge.jpg",
        tags: [{ tag: { name: "local-tag" } }],
        updatedAt: sameDate,
        width: null
      }
    ]);
    getOssObjectMock.mockResolvedValue(
      JSON.stringify({
        description: "From OSS",
        exif: null,
        featured: true,
        height: 2000,
        location: {
          label: "Tokyo",
          latitude: 35.68,
          longitude: 139.69
        },
        objectKey: "uploads/2026/04/merge.jpg",
        syncedAt: "2026-04-30T00:00:00.000Z",
        tags: ["oss-tag"],
        width: 3000
      })
    );
    imageTagDeleteManyMock.mockResolvedValue({ count: 0 });
    imageTagCreateManyMock.mockResolvedValue({ count: 2 });
    locationUpsertMock.mockResolvedValue({});
    imageUpdateMock.mockResolvedValue({});
    imageExifUpsertMock.mockResolvedValue({});

    const { syncUserMetadataWithOss } = await import("@/lib/images/metadata-sync");
    const result = await syncUserMetadataWithOss(user);

    expect(result.mergedCount).toBe(1);
    expect(result.exportedCount).toBe(0);
    expect(result.importedCount).toBe(0);
    // Description from OSS should be imported
    expect(imageUpdateMock).toHaveBeenCalledWith({
      where: { id: "image-3" },
      data: { description: "From OSS", featured: true }
    });
    // Tags should be merged (union)
    expect(imageTagCreateManyMock).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        { imageId: "image-3", tagId: "tag-local" },
        { imageId: "image-3", tagId: "tag-oss" }
      ]),
      skipDuplicates: true
    });
    // Location from OSS should be imported
    expect(locationUpsertMock).toHaveBeenCalled();
  });

  it("fills missing local EXIF fields from OSS without overwriting local EXIF values", async () => {
    imageFindManyMock.mockResolvedValue([
      {
        createdAt: new Date("2026-04-01"),
        deletedAt: null,
        description: null,
        exif: {
          cameraMake: "LocalCamera",
          cameraModel: "LocalModel",
          exposureTime: "1/60",
          fNumber: 1.8,
          focalLength: 35,
          height: null,
          iso: 400,
          latitude: null,
          lensModel: "Local Lens",
          longitude: null,
          orientation: 1,
          raw: {
            Make: "LocalCamera"
          },
          takenAt: new Date("2026-01-01T00:00:00.000Z")
          ,
          width: null
        },
        featured: false,
        height: 1000,
        id: "image-4",
        location: null,
        objectKey: "uploads/2026/04/exif-test.jpg",
        tags: [],
        updatedAt: new Date("2026-04-01"),
        width: 1500
      }
    ]);
    getOssObjectMock.mockResolvedValue(
      JSON.stringify({
        description: null,
        exif: {
          cameraMake: "OssCamera",
          cameraModel: "OssModel",
          exposureTime: "1/125",
          fNumber: 2.0,
          focalLength: 50,
          height: 1200,
          iso: 800,
          latitude: 31.2,
          lensModel: "Oss Lens",
          longitude: 121.4,
          orientation: 1,
          raw: {
            ExposureTime: 0.008,
            Make: "OssCamera",
            Model: "OssModel"
          },
          takenAt: "2026-02-01T00:00:00.000Z",
          width: 1800
        },
        featured: false,
        height: 1000,
        location: null,
        objectKey: "uploads/2026/04/exif-test.jpg",
        syncedAt: "2026-04-30T00:00:00.000Z",
        tags: [],
        width: 1500
      })
    );

    const { syncUserMetadataWithOss } = await import("@/lib/images/metadata-sync");
    const result = await syncUserMetadataWithOss(user);

    expect(result.importedCount).toBe(1);
    expect(imageExifUpsertMock).toHaveBeenCalledWith({
      create: expect.any(Object),
      update: {
        height: 1200,
        latitude: 31.2,
        longitude: 121.4,
        raw: {
          ExposureTime: 0.008,
          Make: "LocalCamera",
          Model: "OssModel"
        },
        width: 1800
      },
      where: { imageId: "image-4" }
    });

    const exportedJson = JSON.parse(putOssObjectMock.mock.calls[0][2]);
    expect(exportedJson.exif).toMatchObject({
      cameraMake: "LocalCamera",
      cameraModel: "LocalModel",
      exposureTime: "1/60",
      height: 1200,
      latitude: 31.2,
      lensModel: "Local Lens",
      longitude: 121.4,
      raw: {
        ExposureTime: 0.008,
        Make: "LocalCamera",
        Model: "OssModel"
      },
      takenAt: "2026-01-01T00:00:00.000Z",
      width: 1800
    });
  });

  it("skips when timestamps are equal and no merge needed", async () => {
    const sameDate = new Date("2026-04-30T00:00:00.000Z");
    imageFindManyMock.mockResolvedValue([
      {
        createdAt: new Date("2026-04-01"),
        deletedAt: null,
        description: "Same desc",
        exif: {
          cameraMake: "Canon",
          cameraModel: "EOS R5",
          exposureTime: "1/1000",
          fNumber: 2.8,
          focalLength: 50,
          iso: 100,
          latitude: null,
          lensModel: "RF 50mm",
          longitude: null,
          orientation: 1,
          takenAt: new Date("2026-03-15T10:30:00.000Z")
        },
        featured: false,
        height: 4000,
        id: "image-5",
        location: null,
        objectKey: "uploads/2026/04/unchanged.jpg",
        tags: [],
        updatedAt: sameDate,
        width: 6000
      }
    ]);
    getOssObjectMock.mockResolvedValue(
      JSON.stringify({
        description: "Same desc",
        exif: {
          cameraMake: "Canon",
          cameraModel: "EOS R5",
          exposureTime: "1/1000",
          fNumber: 2.8,
          focalLength: 50,
          iso: 100,
          latitude: null,
          lensModel: "RF 50mm",
          longitude: null,
          orientation: 1,
          takenAt: "2026-03-15T10:30:00.000Z"
        },
        featured: false,
        height: 4000,
        location: null,
        objectKey: "uploads/2026/04/unchanged.jpg",
        syncedAt: "2026-04-30T00:00:00.000Z",
        tags: [],
        width: 6000
      })
    );

    const { syncUserMetadataWithOss } = await import("@/lib/images/metadata-sync");
    const result = await syncUserMetadataWithOss(user);

    expect(putOssObjectMock).not.toHaveBeenCalled();
    expect(result.exportedCount).toBe(0);
    expect(result.importedCount).toBe(0);
    expect(result.mergedCount).toBe(0);
  });

  it("backfills OSS gaps from local when OSS is newer but incomplete", async () => {
    // Scenario: OSS is newer, has description but no EXIF/dimensions
    // Local has EXIF and dimensions but no description
    // Expected: import description from OSS, backfill EXIF/dimensions to OSS
    imageFindManyMock.mockResolvedValue([
      {
        createdAt: new Date("2026-04-01"),
        deletedAt: null,
        description: null,
        exif: {
          cameraMake: "Canon",
          cameraModel: "EOS R5",
          exposureTime: "1/1000",
          fNumber: 2.8,
          focalLength: 50,
          iso: 100,
          latitude: null,
          lensModel: "RF 50mm",
          longitude: null,
          orientation: 1,
          takenAt: new Date("2026-03-15T10:30:00.000Z")
        },
        featured: false,
        height: 4000,
        id: "image-bidir",
        location: null,
        objectKey: "uploads/2026/04/bidir.jpg",
        tags: [],
        updatedAt: new Date("2026-04-20"),
        width: 6000
      }
    ]);
    getOssObjectMock.mockResolvedValue(
      JSON.stringify({
        description: "OSS has this description",
        exif: null,
        featured: false,
        height: null,
        location: null,
        objectKey: "uploads/2026/04/bidir.jpg",
        syncedAt: "2026-04-30T00:00:00.000Z",
        tags: [],
        width: null
      })
    );
    imageTagDeleteManyMock.mockResolvedValue({ count: 0 });
    imageTagCreateManyMock.mockResolvedValue({ count: 0 });
    imageUpdateMock.mockResolvedValue({});

    const { syncUserMetadataWithOss } = await import("@/lib/images/metadata-sync");
    const result = await syncUserMetadataWithOss(user);

    expect(result.importedCount).toBe(1);
    // Description should be imported to local
    expect(imageUpdateMock).toHaveBeenCalledWith({
      where: { id: "image-bidir" },
      data: { description: "OSS has this description" }
    });
    // OSS should be backfilled with EXIF and dimensions from local
    const putCalls = putOssObjectMock.mock.calls;
    expect(putCalls.length).toBe(1);
    const backfilledJson = JSON.parse(putCalls[0][2]);
    expect(backfilledJson.description).toBe("OSS has this description");
    expect(backfilledJson.exif).toEqual({
      cameraMake: "Canon",
      cameraModel: "EOS R5",
      exposureTime: "1/1000",
      fNumber: 2.8,
      focalLength: 50,
      iso: 100,
      latitude: null,
      lensModel: "RF 50mm",
      longitude: null,
      orientation: 1,
      takenAt: "2026-03-15T10:30:00.000Z"
    });
    expect(backfilledJson.width).toBe(6000);
    expect(backfilledJson.height).toBe(4000);
  });

  it("backfills local gaps from OSS when local is newer but incomplete", async () => {
    // Scenario: Local is newer, has EXIF but no description
    // OSS has description but no EXIF
    // Expected: export to OSS with merged data (description from OSS + EXIF from local)
    imageFindManyMock.mockResolvedValue([
      {
        createdAt: new Date("2026-04-01"),
        deletedAt: null,
        description: null,
        exif: {
          cameraMake: "Sony",
          cameraModel: "A7R IV",
          exposureTime: "1/250",
          fNumber: 4,
          focalLength: 24,
          iso: 200,
          latitude: null,
          lensModel: "FE 24-70mm",
          longitude: null,
          orientation: 1,
          takenAt: new Date("2026-03-20T14:00:00.000Z")
        },
        featured: false,
        height: 3000,
        id: "image-backfill",
        location: null,
        objectKey: "uploads/2026/04/backfill.jpg",
        tags: [],
        updatedAt: new Date("2026-04-30"),
        width: 4000
      }
    ]);
    getOssObjectMock.mockResolvedValue(
      JSON.stringify({
        description: "OSS description",
        exif: null,
        featured: false,
        height: null,
        location: null,
        objectKey: "uploads/2026/04/backfill.jpg",
        syncedAt: "2026-04-20T00:00:00.000Z",
        tags: [],
        width: null
      })
    );
    putOssObjectMock.mockResolvedValue(undefined);

    const { syncUserMetadataWithOss } = await import("@/lib/images/metadata-sync");
    const result = await syncUserMetadataWithOss(user);

    expect(result.exportedCount).toBe(1);
    // OSS should get the merged result: description from OSS + EXIF from local
    const putCalls = putOssObjectMock.mock.calls;
    expect(putCalls.length).toBe(1);
    const exportedJson = JSON.parse(putCalls[0][2]);
    expect(exportedJson.description).toBe("OSS description");
    expect(exportedJson.exif).toEqual({
      cameraMake: "Sony",
      cameraModel: "A7R IV",
      exposureTime: "1/250",
      fNumber: 4,
      focalLength: 24,
      iso: 200,
      latitude: null,
      lensModel: "FE 24-70mm",
      longitude: null,
      orientation: 1,
      takenAt: "2026-03-20T14:00:00.000Z"
    });
    expect(exportedJson.width).toBe(4000);
    expect(exportedJson.height).toBe(3000);
  });

  it("skips soft-deleted images during metadata sync", async () => {
    imageFindManyMock.mockResolvedValue([
      {
        createdAt: new Date("2026-04-01"),
        deletedAt: new Date("2026-04-29"),
        description: "Deleted image",
        exif: null,
        featured: false,
        height: null,
        id: "image-6",
        location: null,
        objectKey: "uploads/2026/04/deleted.jpg",
        tags: [],
        updatedAt: new Date("2026-04-29"),
        width: null
      }
    ]);
    getOssObjectMock.mockResolvedValue(null);

    const { syncUserMetadataWithOss } = await import("@/lib/images/metadata-sync");
    const result = await syncUserMetadataWithOss(user);

    expect(putOssObjectMock).not.toHaveBeenCalled();
    expect(result.exportedCount).toBe(0);
    expect(result.skippedDeletedCount).toBe(1);
  });

  it("uses configurable metadata prefix", async () => {
    const customConfig = { ...config, metadataPrefix: "image-meta" };
    resolveUserOssConfigMock.mockResolvedValue(customConfig);
    imageFindManyMock.mockResolvedValue([
      {
        createdAt: new Date("2026-04-01"),
        deletedAt: null,
        description: null,
        exif: null,
        featured: false,
        height: null,
        id: "image-7",
        location: null,
        objectKey: "uploads/2026/04/test.jpg",
        tags: [],
        updatedAt: new Date("2026-04-30"),
        width: null
      }
    ]);
    getOssObjectMock.mockResolvedValue(null);
    putOssObjectMock.mockResolvedValue(undefined);

    const { syncUserMetadataWithOss } = await import("@/lib/images/metadata-sync");
    await syncUserMetadataWithOss(user);

    expect(getOssObjectMock).toHaveBeenCalledWith(
      customConfig,
      "image-meta/uploads/2026/04/test.jpg.json"
    );
    expect(putOssObjectMock).toHaveBeenCalledWith(
      customConfig,
      "image-meta/uploads/2026/04/test.jpg.json",
      expect.any(String)
    );
  });

  it("throws when OSS config is missing", async () => {
    resolveUserOssConfigMock.mockResolvedValue(null);

    const { syncUserMetadataWithOss } = await import("@/lib/images/metadata-sync");

    await expect(syncUserMetadataWithOss(user)).rejects.toThrow("oss_config_required");
  });

  it("exports metadata for images with no tags, location, or exif", async () => {
    imageFindManyMock.mockResolvedValue([
      {
        createdAt: new Date("2026-04-01"),
        deletedAt: null,
        description: null,
        exif: null,
        featured: false,
        height: null,
        id: "image-8",
        location: null,
        objectKey: "uploads/2026/04/bare.jpg",
        tags: [],
        updatedAt: new Date("2026-04-30"),
        width: null
      }
    ]);
    getOssObjectMock.mockResolvedValue(null);
    putOssObjectMock.mockResolvedValue(undefined);

    const { syncUserMetadataWithOss } = await import("@/lib/images/metadata-sync");
    const result = await syncUserMetadataWithOss(user);

    const putCall = putOssObjectMock.mock.calls[0];
    const metadataJson = JSON.parse(putCall[2]);
    expect(metadataJson.description).toBeNull();
    expect(metadataJson.featured).toBe(false);
    expect(metadataJson.tags).toEqual([]);
    expect(metadataJson.location).toBeNull();
    expect(metadataJson.exif).toBeNull();
    expect(metadataJson.width).toBeNull();
    expect(metadataJson.height).toBeNull();
    expect(result.exportedCount).toBe(1);
  });
});

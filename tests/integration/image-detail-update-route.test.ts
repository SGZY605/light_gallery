import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUser = vi.fn();
const imageFindUniqueMock = vi.fn();
const tagFindManyMock = vi.fn();
const transactionMock = vi.fn();
const imageTagDeleteManyMock = vi.fn();
const imageTagCreateManyMock = vi.fn();
const imageLocationOverrideUpsertMock = vi.fn();
const imageLocationOverrideDeleteManyMock = vi.fn();
const auditLogCreateMock = vi.fn();

vi.mock("@/lib/auth/session", () => ({
  getCurrentUser
}));

vi.mock("@/lib/db", () => ({
  db: {
    image: {
      findUnique: imageFindUniqueMock
    },
    tag: {
      findMany: tagFindManyMock
    },
    $transaction: transactionMock
  }
}));

describe("PUT /api/images/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    getCurrentUser.mockResolvedValue({
      id: "user-1",
      role: "ADMIN"
    });

    imageFindUniqueMock
      .mockResolvedValueOnce({
        id: "image-1",
        deletedAt: null,
        tags: [{ tag: { id: "tag-1", name: "Travel", slug: "travel", color: null } }],
        location: null
      })
      .mockResolvedValueOnce({
        id: "image-1",
        deletedAt: null,
        tags: [
          { tag: { id: "tag-1", name: "Travel", slug: "travel", color: null } },
          { tag: { id: "tag-2", name: "Japan", slug: "japan", color: "#ff0000" } }
        ],
        location: {
          latitude: 35.6,
          longitude: 139.7,
          label: "Tokyo"
        }
      });

    tagFindManyMock.mockResolvedValue([{ id: "tag-1" }, { id: "tag-2" }]);

    imageTagDeleteManyMock.mockResolvedValue({ count: 1 });
    imageTagCreateManyMock.mockResolvedValue({ count: 2 });
    imageLocationOverrideUpsertMock.mockResolvedValue({
      imageId: "image-1",
      latitude: 35.6,
      longitude: 139.7,
      label: "Tokyo"
    });
    imageLocationOverrideDeleteManyMock.mockResolvedValue({ count: 1 });
    auditLogCreateMock.mockResolvedValue({ id: "audit-1" });

    transactionMock.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({
        imageTag: {
          deleteMany: imageTagDeleteManyMock,
          createMany: imageTagCreateManyMock
        },
        imageLocationOverride: {
          upsert: imageLocationOverrideUpsertMock,
          deleteMany: imageLocationOverrideDeleteManyMock
        },
        auditLog: {
          create: auditLogCreateMock
        }
      })
    );
  });

  it("updates tags and manual location in one transaction", async () => {
    const { PUT } = await import("@/app/api/images/[id]/route");

    const response = await PUT(
      new Request("http://localhost/api/images/image-1", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tagIds: ["tag-1", "tag-2"],
          location: { latitude: 35.6, longitude: 139.7, label: "Tokyo" }
        })
      }),
      {
        params: Promise.resolve({ id: "image-1" })
      }
    );

    const result = (await response.json()) as {
      tags: Array<{ id: string }>;
      location: { latitude: number; longitude: number; label: string | null } | null;
    };

    expect(response.status).toBe(200);
    expect(imageTagDeleteManyMock).toHaveBeenCalledWith({
      where: { imageId: "image-1" }
    });
    expect(imageTagCreateManyMock).toHaveBeenCalledWith({
      data: [
        { imageId: "image-1", tagId: "tag-1" },
        { imageId: "image-1", tagId: "tag-2" }
      ]
    });
    expect(imageLocationOverrideUpsertMock).toHaveBeenCalledWith({
      where: { imageId: "image-1" },
      update: {
        latitude: 35.6,
        longitude: 139.7,
        label: "Tokyo",
        source: "manual",
        updatedById: "user-1"
      },
      create: {
        imageId: "image-1",
        latitude: 35.6,
        longitude: 139.7,
        label: "Tokyo",
        source: "manual",
        updatedById: "user-1"
      }
    });
    expect(result.tags).toHaveLength(2);
    expect(result.location).toEqual({
      latitude: 35.6,
      longitude: 139.7,
      label: "Tokyo"
    });
  });

  it("deletes manual location when payload location is null", async () => {
    imageFindUniqueMock.mockReset();
    tagFindManyMock.mockResolvedValue([{ id: "tag-1" }]);
    imageFindUniqueMock
      .mockResolvedValueOnce({
        id: "image-1",
        deletedAt: null,
        tags: [{ tag: { id: "tag-1", name: "Travel", slug: "travel", color: null } }],
        location: { latitude: 31.2304, longitude: 121.4737, label: "Shanghai" }
      })
      .mockResolvedValueOnce({
        id: "image-1",
        deletedAt: null,
        tags: [{ tag: { id: "tag-1", name: "Travel", slug: "travel", color: null } }],
        location: null
      });

    const { PUT } = await import("@/app/api/images/[id]/route");

    const response = await PUT(
      new Request("http://localhost/api/images/image-1", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tagIds: ["tag-1"],
          location: null
        })
      }),
      {
        params: Promise.resolve({ id: "image-1" })
      }
    );

    const result = (await response.json()) as {
      location: null;
    };

    expect(response.status).toBe(200);
    expect(imageLocationOverrideDeleteManyMock).toHaveBeenCalledWith({
      where: { imageId: "image-1" }
    });
    expect(result.location).toBeNull();
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUser = vi.fn();
const imageFindUniqueMock = vi.fn();
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
    imageLocationOverride: {
      upsert: imageLocationOverrideUpsertMock,
      deleteMany: imageLocationOverrideDeleteManyMock
    },
    auditLog: {
      create: auditLogCreateMock
    }
  }
}));

describe("location override route", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    getCurrentUser.mockResolvedValue({
      id: "user-1",
      role: "ADMIN"
    });
    imageFindUniqueMock.mockResolvedValue({ id: "image-1" });
    imageLocationOverrideUpsertMock.mockResolvedValue({
      imageId: "image-1",
      latitude: 35.6,
      longitude: 139.7,
      label: "Tokyo"
    });
    imageLocationOverrideDeleteManyMock.mockResolvedValue({ count: 1 });
    auditLogCreateMock.mockResolvedValue({ id: "audit-1" });
  });

  it("upserts manual coordinates", async () => {
    const { PUT } = await import("@/app/api/images/[id]/location/route");

    const response = await PUT(
      new Request("http://localhost/api/images/image-1/location", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          latitude: 35.6,
          longitude: 139.7,
          label: "Tokyo"
        })
      }),
      {
        params: Promise.resolve({ id: "image-1" })
      }
    );

    expect(response.status).toBe(200);
    expect(imageLocationOverrideUpsertMock).toHaveBeenCalledWith({
      where: {
        imageId: "image-1"
      },
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
  });

  it("clears manual coordinates", async () => {
    const { DELETE } = await import("@/app/api/images/[id]/location/route");

    const response = await DELETE(new Request("http://localhost/api/images/image-1/location", { method: "DELETE" }), {
      params: Promise.resolve({ id: "image-1" })
    });

    expect(response.status).toBe(200);
    expect(imageLocationOverrideDeleteManyMock).toHaveBeenCalledWith({
      where: {
        imageId: "image-1"
      }
    });
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUserMock = vi.fn();
const deleteOwnedImageEverywhereMock = vi.fn();

vi.mock("@/lib/auth/session", () => ({
  getCurrentUser: getCurrentUserMock
}));

vi.mock("@/lib/images/sync", () => ({
  deleteOwnedImageEverywhere: deleteOwnedImageEverywhereMock
}));

describe("DELETE /api/images/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentUserMock.mockResolvedValue({
      id: "user-1",
      role: "MEMBER"
    });
  });

  it("deletes the owned image from OSS and local records", async () => {
    deleteOwnedImageEverywhereMock.mockResolvedValue({ deleted: true });
    const { DELETE } = await import("@/app/api/images/[id]/route");

    const response = await DELETE(
      new Request("http://localhost/api/images/image-1", { method: "DELETE" }),
      {
        params: Promise.resolve({ id: "image-1" })
      }
    );
    const payload = (await response.json()) as { deleted: boolean };

    expect(response.status).toBe(200);
    expect(payload).toEqual({ deleted: true });
    expect(deleteOwnedImageEverywhereMock).toHaveBeenCalledWith({
      imageId: "image-1",
      user: expect.objectContaining({ id: "user-1" })
    });
  });

  it("returns 404 when the image does not belong to the current user", async () => {
    deleteOwnedImageEverywhereMock.mockResolvedValue({ deleted: false });
    const { DELETE } = await import("@/app/api/images/[id]/route");

    const response = await DELETE(
      new Request("http://localhost/api/images/image-2", { method: "DELETE" }),
      {
        params: Promise.resolve({ id: "image-2" })
      }
    );

    expect(response.status).toBe(404);
  });

  it("does not report success when OSS deletion fails", async () => {
    deleteOwnedImageEverywhereMock.mockRejectedValue(new Error("OSS DELETE object failed with status 403"));
    const { DELETE } = await import("@/app/api/images/[id]/route");

    const response = await DELETE(
      new Request("http://localhost/api/images/image-3", { method: "DELETE" }),
      {
        params: Promise.resolve({ id: "image-3" })
      }
    );
    const payload = (await response.json()) as { error: string };

    expect(response.status).toBe(502);
    expect(payload.error).toContain("OSS");
  });

  it("requires login", async () => {
    getCurrentUserMock.mockResolvedValue(null);
    const { DELETE } = await import("@/app/api/images/[id]/route");

    const response = await DELETE(
      new Request("http://localhost/api/images/image-1", { method: "DELETE" }),
      {
        params: Promise.resolve({ id: "image-1" })
      }
    );

    expect(response.status).toBe(401);
    expect(deleteOwnedImageEverywhereMock).not.toHaveBeenCalled();
  });
});

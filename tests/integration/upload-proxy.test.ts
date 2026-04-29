import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUser = vi.fn();
const transactionMock = vi.fn();
const tagFindManyMock = vi.fn();
const tagUpsertMock = vi.fn();
const imageCreateMock = vi.fn();
const uploadItemUpdateManyMock = vi.fn();
const auditLogCreateMock = vi.fn();
const fetchMock = vi.fn();

vi.mock("@/lib/auth/session", () => ({
  getCurrentUser
}));

vi.mock("@/lib/db", () => ({
  db: {
    $transaction: transactionMock
  }
}));

vi.mock("@/lib/oss/config", () => ({
  getOssConfig: () => ({
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
  })
}));

describe("POST /api/uploads/proxy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", fetchMock);

    getCurrentUser.mockResolvedValue({
      id: "user-1",
      role: "ADMIN"
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

    tagFindManyMock.mockResolvedValue([]);
    tagUpsertMock.mockResolvedValue({
      id: "tag-1",
      name: "Avatar",
      slug: "avatar"
    });
    imageCreateMock.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      id: "image-1",
      objectKey: data.objectKey,
      filename: data.filename,
      width: data.width ?? null,
      height: data.height ?? null,
      tags: [{ tag: { id: "tag-1", name: "Avatar", slug: "avatar" } }]
    }));
    uploadItemUpdateManyMock.mockResolvedValue({ count: 0 });
    auditLogCreateMock.mockResolvedValue({ id: "audit-1" });
    fetchMock.mockResolvedValue(new Response("", { status: 200 }));
  });

  it("uploads the file to OSS from the server and persists metadata", async () => {
    const { POST } = await import("@/app/api/uploads/proxy/route");
    const formData = new FormData();
    const file = new File([new Uint8Array([137, 80, 78, 71])], "头像.png", {
      type: "image/png"
    });

    formData.append("file", file);
    formData.append("width", "513");
    formData.append("height", "513");
    formData.append("description", "Profile picture");
    formData.append("tagNames", JSON.stringify(["Avatar"]));
    formData.append("tagIds", JSON.stringify([]));
    formData.append("exif", JSON.stringify({ width: 513, height: 513 }));

    const response = await POST(
      new Request("http://localhost/api/uploads/proxy", {
        method: "POST",
        body: formData
      })
    );
    const result = (await response.json()) as { image: { id: string; objectKey: string } };

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://gallery-sgzy.oss-cn-beijing.aliyuncs.com",
      expect.objectContaining({
        method: "POST",
        body: expect.any(FormData)
      })
    );
    expect(imageCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          filename: "头像.png",
          mimeType: "image/png",
          sizeBytes: 4,
          width: 513,
          height: 513,
          description: "Profile picture",
          uploaderId: "user-1",
          tags: {
            create: [{ tagId: "tag-1" }]
          }
        })
      })
    );
    expect(result.image.id).toBe("image-1");
    expect(result.image.objectKey).toMatch(/^uploads\/\d{4}\/\d{2}\/[a-f0-9]+-image\.png$/);
  });
});

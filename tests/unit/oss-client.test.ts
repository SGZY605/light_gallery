import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ResolvedOssConfig } from "@/lib/oss/user-config";

const config: ResolvedOssConfig = {
  accessKeyId: "test-access-key",
  accessKeySecret: "test-access-secret",
  allowedMimePrefix: "image/",
  bucket: "gallery-bucket",
  maxUploadBytes: 25 * 1024 * 1024,
  policyExpiresSeconds: 300,
  publicBaseUrl: "https://cdn.example.com/gallery",
  region: "cn-shanghai",
  uploadBaseUrl: "https://gallery-bucket.oss-cn-shanghai.aliyuncs.com",
  uploadPrefix: "uploads"
};

function expectedSignature(method: string, resource: string, date: string) {
  const stringToSign = `${method}\n\n\n${date}\n${resource}`;
  return createHmac("sha1", config.accessKeySecret).update(stringToSign).digest("base64");
}

describe("OSS REST client", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("checks object existence with a signed HEAD request", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const { headOssObject } = await import("@/lib/oss/client");

    const exists = await headOssObject(config, "uploads/2026/04/demo photo.jpg");

    expect(exists).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const requestUrl = new URL(url);
    const date = new Headers(init.headers).get("Date") ?? "";
    expect(init.method).toBe("HEAD");
    expect(requestUrl.toString()).toBe(
      "https://gallery-bucket.oss-cn-shanghai.aliyuncs.com/uploads/2026/04/demo%20photo.jpg"
    );
    expect(new Headers(init.headers).get("Authorization")).toBe(
      `OSS ${config.accessKeyId}:${expectedSignature(
        "HEAD",
        "/gallery-bucket/uploads/2026/04/demo photo.jpg",
        date
      )}`
    );
  });

  it("returns false for missing objects", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 404 })));
    const { headOssObject } = await import("@/lib/oss/client");

    await expect(headOssObject(config, "uploads/missing.jpg")).resolves.toBe(false);
  });

  it("deletes an object with a signed DELETE request", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    const { deleteOssObject } = await import("@/lib/oss/client");

    await deleteOssObject(config, "uploads/2026/04/demo.jpg");

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://gallery-bucket.oss-cn-shanghai.aliyuncs.com/uploads/2026/04/demo.jpg");
    expect(init.method).toBe("DELETE");
    expect(new Headers(init.headers).get("Authorization")).toMatch(/^OSS test-access-key:/);
  });

  it("lists OSS objects under a prefix and parses metadata", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          `<?xml version="1.0" encoding="UTF-8"?>
          <ListBucketResult>
            <IsTruncated>true</IsTruncated>
            <NextMarker>uploads/2026/04/second.jpg</NextMarker>
            <Contents>
              <Key>uploads/2026/04/first.jpg</Key>
              <LastModified>2026-04-30T08:00:00.000Z</LastModified>
              <Size>1234</Size>
            </Contents>
            <Contents>
              <Key>uploads/2026/04/second.jpg</Key>
              <LastModified>2026-04-30T08:01:00.000Z</LastModified>
              <Size>2048</Size>
            </Contents>
          </ListBucketResult>`,
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          `<?xml version="1.0" encoding="UTF-8"?>
          <ListBucketResult>
            <IsTruncated>false</IsTruncated>
            <Contents>
              <Key>uploads/2026/04/third.jpg</Key>
              <LastModified>2026-04-30T08:02:00.000Z</LastModified>
              <Size>4096</Size>
            </Contents>
          </ListBucketResult>`,
          { status: 200 }
        )
      );
    vi.stubGlobal("fetch", fetchMock);
    const { listOssObjects } = await import("@/lib/oss/client");

    const objects = await listOssObjects(config, "uploads");

    expect(objects).toEqual([
      {
        key: "uploads/2026/04/first.jpg",
        lastModified: new Date("2026-04-30T08:00:00.000Z"),
        size: 1234
      },
      {
        key: "uploads/2026/04/second.jpg",
        lastModified: new Date("2026-04-30T08:01:00.000Z"),
        size: 2048
      },
      {
        key: "uploads/2026/04/third.jpg",
        lastModified: new Date("2026-04-30T08:02:00.000Z"),
        size: 4096
      }
    ]);
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("marker=uploads%2F2026%2F04%2Fsecond.jpg"),
      expect.objectContaining({ method: "GET" })
    );
  });
});

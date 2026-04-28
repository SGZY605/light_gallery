import { describe, expect, it } from "vitest";
import { buildOssImageUrl } from "@/lib/oss/urls";

describe("buildOssImageUrl", () => {
  it("builds thumbnail URLs with resize params", () => {
    const url = buildOssImageUrl("photos/a.jpg", "thumb", {
      publicBaseUrl: "https://cdn.example.com"
    });

    expect(url).toBe(
      "https://cdn.example.com/photos/a.jpg?x-oss-process=image/resize,w_480/quality,q_82"
    );
  });

  it("encodes object key path segments", () => {
    const url = buildOssImageUrl("photos/hello world.jpg", "preview", {
      publicBaseUrl: "https://cdn.example.com"
    });

    expect(url).toBe(
      "https://cdn.example.com/photos/hello%20world.jpg?x-oss-process=image/resize,w_1600/quality,q_88"
    );
  });

  it("returns original URLs without image processing params", () => {
    const url = buildOssImageUrl("photos/raw image.jpg", "original", {
      publicBaseUrl: "https://cdn.example.com/gallery/"
    });

    expect(url).toBe("https://cdn.example.com/gallery/photos/raw%20image.jpg");
  });
});

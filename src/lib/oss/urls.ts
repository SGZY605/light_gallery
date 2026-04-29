import { getOssConfig } from "@/lib/oss/config";

export type OssImageVariant = "thumb" | "preview" | "original";

type BuildOssImageUrlOptions = {
  publicBaseUrl?: string;
};

const IMAGE_PROCESSING_PARAMETERS: Record<Exclude<OssImageVariant, "original">, string> = {
  preview: "image/resize,w_1600/quality,q_88",
  thumb: "image/resize,w_480/quality,q_82"
};

function encodeObjectKey(objectKey: string): string {
  const encodedSegments = objectKey
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment));

  if (encodedSegments.length === 0) {
    throw new Error("objectKey must not be empty");
  }

  return encodedSegments.join("/");
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

export function buildOssImageUrl(
  objectKey: string,
  variant: OssImageVariant,
  options: BuildOssImageUrlOptions = {}
): string {
  const resolvedPublicBaseUrl =
    options.publicBaseUrl ??
    process.env.NEXT_PUBLIC_OSS_PUBLIC_BASE_URL ??
    (typeof window === "undefined" ? getOssConfig().publicBaseUrl : null);

  if (!resolvedPublicBaseUrl) {
    throw new Error("publicBaseUrl is required when buildOssImageUrl is used in client components");
  }

  const publicBaseUrl = trimTrailingSlash(resolvedPublicBaseUrl);
  const encodedObjectKey = encodeObjectKey(objectKey);
  const baseUrl = `${publicBaseUrl}/${encodedObjectKey}`;

  if (variant === "original") {
    return baseUrl;
  }

  return `${baseUrl}?x-oss-process=${IMAGE_PROCESSING_PARAMETERS[variant]}`;
}

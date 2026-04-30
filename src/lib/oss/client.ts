import { createHmac } from "node:crypto";
import type { ResolvedOssConfig } from "@/lib/oss/user-config";

export type OssListedObject = {
  key: string;
  lastModified: Date | null;
  size: number;
};

const OSS_LIST_MAX_KEYS = 1000;

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function encodeObjectKey(objectKey: string): string {
  const encodedKey = objectKey
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  if (!encodedKey) {
    throw new Error("objectKey must not be empty");
  }

  return encodedKey;
}

function normalizePrefix(prefix: string): string {
  return prefix.trim().replace(/^\/+|\/+$/g, "");
}

function buildObjectUrl(config: ResolvedOssConfig, objectKey: string): string {
  return `${trimTrailingSlash(config.uploadBaseUrl)}/${encodeObjectKey(objectKey)}`;
}

function buildListUrl(config: ResolvedOssConfig, prefix: string, marker?: string): string {
  const url = new URL(`${trimTrailingSlash(config.uploadBaseUrl)}/`);
  const normalizedPrefix = normalizePrefix(prefix);

  if (normalizedPrefix) {
    url.searchParams.set("prefix", `${normalizedPrefix}/`);
  }

  if (marker) {
    url.searchParams.set("marker", marker);
  }

  url.searchParams.set("max-keys", String(OSS_LIST_MAX_KEYS));

  return url.toString();
}

function buildAuthorizationHeader({
  config,
  date,
  method,
  resource
}: {
  config: ResolvedOssConfig;
  date: string;
  method: string;
  resource: string;
}): string {
  const stringToSign = `${method}\n\n\n${date}\n${resource}`;
  const signature = createHmac("sha1", config.accessKeySecret).update(stringToSign).digest("base64");

  return `OSS ${config.accessKeyId}:${signature}`;
}

function buildSignedHeaders(config: ResolvedOssConfig, method: string, resource: string): Headers {
  const date = new Date().toUTCString();
  const headers = new Headers();

  headers.set("Date", date);
  headers.set(
    "Authorization",
    buildAuthorizationHeader({
      config,
      date,
      method,
      resource
    })
  );

  return headers;
}

function assertOssResponse(response: Response, operation: string) {
  if (!response.ok) {
    throw new Error(`${operation} failed with status ${response.status}`);
  }
}

function decodeXmlText(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function readXmlTag(xml: string, tagName: string): string | null {
  const match = new RegExp(`<${tagName}>([\\s\\S]*?)</${tagName}>`).exec(xml);
  return match ? decodeXmlText(match[1].trim()) : null;
}

function parseListObjectsXml(xml: string): {
  isTruncated: boolean;
  nextMarker: string | null;
  objects: OssListedObject[];
} {
  const contents = xml.match(/<Contents>[\s\S]*?<\/Contents>/g) ?? [];

  return {
    isTruncated: readXmlTag(xml, "IsTruncated") === "true",
    nextMarker: readXmlTag(xml, "NextMarker"),
    objects: contents
      .map((entry) => {
        const key = readXmlTag(entry, "Key");
        const size = Number.parseInt(readXmlTag(entry, "Size") ?? "", 10);
        const lastModified = readXmlTag(entry, "LastModified");

        if (!key || !Number.isFinite(size)) {
          return null;
        }

        return {
          key,
          lastModified: lastModified ? new Date(lastModified) : null,
          size
        } satisfies OssListedObject;
      })
      .filter((object): object is OssListedObject => object !== null)
  };
}

export async function headOssObject(config: ResolvedOssConfig, objectKey: string): Promise<boolean> {
  const response = await fetch(buildObjectUrl(config, objectKey), {
    method: "HEAD",
    headers: buildSignedHeaders(config, "HEAD", `/${config.bucket}/${objectKey}`)
  });

  if (response.status === 404) {
    return false;
  }

  assertOssResponse(response, "OSS HEAD object");
  return true;
}

export async function deleteOssObject(config: ResolvedOssConfig, objectKey: string): Promise<void> {
  const response = await fetch(buildObjectUrl(config, objectKey), {
    method: "DELETE",
    headers: buildSignedHeaders(config, "DELETE", `/${config.bucket}/${objectKey}`)
  });

  if (response.status === 404) {
    return;
  }

  assertOssResponse(response, "OSS DELETE object");
}

export async function listOssObjects(config: ResolvedOssConfig, prefix: string): Promise<OssListedObject[]> {
  const objects: OssListedObject[] = [];
  let marker: string | undefined;

  do {
    const response = await fetch(buildListUrl(config, prefix, marker), {
      method: "GET",
      headers: buildSignedHeaders(config, "GET", `/${config.bucket}/`)
    });

    assertOssResponse(response, "OSS LIST objects");

    const parsed = parseListObjectsXml(await response.text());
    objects.push(...parsed.objects);
    marker = parsed.isTruncated ? parsed.nextMarker ?? parsed.objects.at(-1)?.key : undefined;
  } while (marker);

  return objects;
}

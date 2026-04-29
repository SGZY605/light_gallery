import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = process.cwd();

function readProjectFile(path: string): string {
  return readFileSync(join(projectRoot, path), "utf8");
}

function parseEnvExampleKeys(): Set<string> {
  const content = readProjectFile(".env.example");

  return new Set(
    content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => line.split("=", 1)[0])
  );
}

describe(".env.example", () => {
  it("uses IPv4 loopback for host-side Prisma commands", () => {
    const content = readProjectFile(".env.example");

    expect(content).toContain(
      'DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:55432/light_gallery?schema=public"'
    );
  });

  it("documents every configuration key needed for local development and Docker", () => {
    const keys = parseEnvExampleKeys();
    const requiredKeys = [
      "POSTGRES_DB",
      "POSTGRES_USER",
      "POSTGRES_PASSWORD",
      "POSTGRES_PORT",
      "DATABASE_URL",
      "DOCKER_DATABASE_URL",
      "NODE_ENV",
      "APP_PORT",
      "APP_HOSTNAME",
      "SESSION_SECRET",
      "SEED_ADMIN_PASSWORD",
      "RUN_DB_SEED",
      "DB_INIT_MAX_ATTEMPTS",
      "DB_INIT_RETRY_DELAY_SECONDS",
      "PLAYWRIGHT_BASE_URL",
      "OSS_REGION",
      "OSS_BUCKET",
      "OSS_ACCESS_KEY_ID",
      "OSS_ACCESS_KEY_SECRET",
      "OSS_PUBLIC_BASE_URL",
      "OSS_UPLOAD_BASE_URL",
      "NEXT_PUBLIC_OSS_PUBLIC_BASE_URL",
      "OSS_MAX_UPLOAD_BYTES",
      "OSS_POLICY_EXPIRES_SECONDS",
      "OSS_ALLOWED_MIME_PREFIX",
      "OSS_UPLOAD_PREFIX"
    ];

    expect([...keys].sort()).toEqual(expect.arrayContaining(requiredKeys));
  });

  it("exposes the Postgres container port through the configured host port", () => {
    const compose = readProjectFile("docker-compose.yml");

    expect(compose).toContain('"127.0.0.1:${POSTGRES_PORT}:5432"');
  });
});

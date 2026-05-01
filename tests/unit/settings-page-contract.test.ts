import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = process.cwd();

function readProjectFile(path: string): string {
  return readFileSync(join(projectRoot, path), "utf8");
}

describe("OSS settings page contract", () => {
  it("renders editable per-user OSS config fields and preserves blank secrets", () => {
    const content = readProjectFile("src/app/dashboard/settings/page.tsx");

    expect(content).toContain("saveOssConfigAction");
    expect(content).toContain("SyncButton");
    expect(content).toContain('name="region"');
    expect(content).toContain('name="bucket"');
    expect(content).toContain('name="accessKeyId"');
    expect(content).toContain('name="accessKeySecret"');
    expect(content).toContain('name="publicBaseUrl"');
    expect(content).toContain('name="uploadBaseUrl"');
    expect(content).toContain('name="uploadPrefix"');
    expect(content).toContain('name="metadataPrefix"');
    expect(content).toContain('name="maxUploadBytes"');
    expect(content).toContain('name="policyExpiresSeconds"');
    expect(content).toContain('name="allowedMimePrefix"');
    expect(content).toContain("existing?.accessKeySecret");
    expect(content).not.toContain('defaultValue={config?.accessKeySecret');
    expect(content).toContain('<SyncButton disabled={!config} />');
  });

  it("SyncButton component has sync UI with progress", () => {
    const syncButton = readProjectFile("src/components/sync-button.tsx");

    expect(syncButton).toContain('"use client"');
    expect(syncButton).toContain("执行本地与 OSS 同步");
    expect(syncButton).toContain("同步中...");
    expect(syncButton).toContain("/api/sync");
  });

  it("dashboard layout shows a missing OSS config reminder", () => {
    const layout = readProjectFile("src/app/dashboard/layout.tsx");
    const notice = readProjectFile("src/components/oss-config-required-notice.tsx");

    expect(layout).toContain("OssConfigRequiredNotice");
    expect(layout).toContain("resolveUserOssConfig");
    expect(layout).toContain("!ossConfig");
    expect(notice).toContain("/dashboard/settings");
    expect(notice).toContain("OSS");
  });
});

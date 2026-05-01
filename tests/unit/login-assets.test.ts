import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = process.cwd();

function readProjectFile(path: string): string {
  return readFileSync(join(projectRoot, path), "utf8");
}

describe("login assets", () => {
  it("uses the synchronized login background from assets during builds", () => {
    const loginPage = readProjectFile("src/app/(auth)/login/page.tsx");
    const syncScript = readProjectFile("scripts/sync-brand-assets.mjs");

    expect(loginPage).toContain("/login_background.png");
    expect(loginPage).not.toContain("TheStarryNight.png");
    expect(syncScript).toContain("assets/login_background.png");
    expect(syncScript).toContain("public/login_background.png");
    expect(existsSync(join(projectRoot, "assets", "login_background.png"))).toBe(true);
    expect(existsSync(join(projectRoot, "public", "login_background.png"))).toBe(true);
  });
});

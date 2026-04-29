import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = process.cwd();

function readProjectFile(path: string): string {
  return readFileSync(join(projectRoot, path), "utf8");
}

describe("map explorer theme styling", () => {
  it("uses dashboard theme tokens instead of fixed slate colors for cards and text", () => {
    const content = readProjectFile("src/components/map-explorer.tsx");
    const fixedCardClasses = [
      "bg-slate-50",
      "bg-slate-200",
      "border-slate-200",
      "border-slate-300",
      "text-slate-950",
      "text-slate-600",
      "text-slate-500",
      "text-slate-400"
    ];

    for (const className of fixedCardClasses) {
      expect(content).not.toMatch(new RegExp(`(^|\\s)${className}(\\s|")`));
    }
  });
});

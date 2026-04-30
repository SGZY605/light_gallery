import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  clampLibraryColumnCount,
  DEFAULT_LIBRARY_COLUMN_COUNT,
  MAX_LIBRARY_COLUMN_COUNT,
  MIN_LIBRARY_COLUMN_COUNT
} from "@/lib/library/columns";

const projectRoot = process.cwd();

function readProjectFile(path: string): string {
  return readFileSync(join(projectRoot, path), "utf8");
}

describe("library column helpers", () => {
  it("uses 4 columns by default and clamps invalid values into the supported range", () => {
    expect(DEFAULT_LIBRARY_COLUMN_COUNT).toBe(4);
    expect(MIN_LIBRARY_COLUMN_COUNT).toBe(3);
    expect(MAX_LIBRARY_COLUMN_COUNT).toBe(8);
    expect(clampLibraryColumnCount()).toBe(4);
    expect(clampLibraryColumnCount(2)).toBe(3);
    expect(clampLibraryColumnCount(9)).toBe(8);
    expect(clampLibraryColumnCount(6)).toBe(6);
  });
});

describe("library page source contracts", () => {
  it("routes the library page through a client shell that owns the column count state and receives the saved user preference", () => {
    const pageSource = readProjectFile("src/app/dashboard/library/page.tsx");
    const shellSource = readProjectFile("src/components/library-page-shell.tsx");

    expect(pageSource).toContain("LibraryPageShell");
    expect(pageSource).toContain("initialColumnCount={user.libraryColumnCount}");
    expect(shellSource).toContain("initialColumnCount: number");
    expect(shellSource).toContain("useState(initialColumnCount)");
    expect(shellSource).toContain("LibraryColumnControl");
    expect(shellSource).toContain("LibraryFilterBar");
    expect(shellSource).toContain("columnCount={columnCount}");
    expect(shellSource).toContain('fetch("/api/users/library-preference"');
    expect(shellSource).toContain("setTimeout");
  });

  it("adds a left-anchored floating slider control with the same motion language as the filter bar", () => {
    const controlSource = readProjectFile("src/components/library-column-control.tsx");

    expect(controlSource).toContain('type="range"');
    expect(controlSource).toContain("MIN_LIBRARY_COLUMN_COUNT");
    expect(controlSource).toContain("MAX_LIBRARY_COLUMN_COUNT");
    expect(controlSource).toContain('transformOrigin: "left"');
    expect(controlSource).toContain('document.addEventListener("mousedown", handlePointerDown)');
    expect(controlSource).toContain('document.addEventListener("keydown", handleKeyDown)');
  });

  it("makes image grid column count controlled instead of using hardcoded responsive column classes", () => {
    const gridSource = readProjectFile("src/components/image-grid.tsx");

    expect(gridSource).toContain("columnCount?: number");
    expect(gridSource).toContain("clampLibraryColumnCount(columnCount)");
    expect(gridSource).toContain("style={{ columnCount: resolvedColumnCount }}");
    expect(gridSource).not.toContain("columns-2 md:columns-3 xl:columns-4");
  });
});

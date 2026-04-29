import { describe, expect, it } from "vitest";
import {
  isNavigationItemActive,
  getNavigationTextColor,
  resolveLayoutMode,
  resolveSidebarMode,
  resolveThemeMode
} from "@/components/dashboard-shell-state";

describe("dashboard shell state", () => {
  it("only marks the dashboard home link active on the exact dashboard path", () => {
    expect(isNavigationItemActive("/dashboard", "/dashboard")).toBe(true);
    expect(isNavigationItemActive("/dashboard", "/dashboard/library")).toBe(false);
    expect(isNavigationItemActive("/dashboard", "/dashboard/library/abc")).toBe(false);
  });

  it("marks section links active for their own paths and child paths", () => {
    expect(isNavigationItemActive("/dashboard/library", "/dashboard/library")).toBe(true);
    expect(isNavigationItemActive("/dashboard/library", "/dashboard/library/abc")).toBe(true);
    expect(isNavigationItemActive("/dashboard/library", "/dashboard/map")).toBe(false);
  });

  it("normalizes stored theme and layout modes", () => {
    expect(resolveThemeMode("light")).toBe("light");
    expect(resolveThemeMode("dark")).toBe("dark");
    expect(resolveThemeMode("unexpected")).toBe("dark");
    expect(resolveThemeMode(null)).toBe("dark");

    expect(resolveLayoutMode("narrow")).toBe("narrow");
    expect(resolveLayoutMode("wide")).toBe("wide");
    expect(resolveLayoutMode("unexpected")).toBe("wide");
    expect(resolveLayoutMode(null)).toBe("wide");
  });

  it("normalizes stored sidebar mode and defaults to expanded", () => {
    expect(resolveSidebarMode("expanded")).toBe("expanded");
    expect(resolveSidebarMode("collapsed")).toBe("collapsed");
    expect(resolveSidebarMode("unexpected")).toBe("expanded");
    expect(resolveSidebarMode(null)).toBe("expanded");
  });

  it("returns theme-aware navigation text colors", () => {
    expect(getNavigationTextColor("light", true)).toBe("rgba(37, 35, 31, 0.92)");
    expect(getNavigationTextColor("light", false)).toBe("rgba(37, 35, 31, 0.52)");
    expect(getNavigationTextColor("dark", true)).toBe("rgba(255, 255, 255, 0.88)");
    expect(getNavigationTextColor("dark", false)).toBe("rgba(255, 255, 255, 0.42)");
  });
});

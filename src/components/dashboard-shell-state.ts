export type DashboardThemeMode = "dark" | "light";
export type DashboardLayoutMode = "wide" | "narrow";

export const DEFAULT_DASHBOARD_THEME: DashboardThemeMode = "dark";
export const DEFAULT_DASHBOARD_LAYOUT: DashboardLayoutMode = "wide";
export const DASHBOARD_THEME_STORAGE_KEY = "light-gallery-dashboard-theme";
export const DASHBOARD_LAYOUT_STORAGE_KEY = "light-gallery-dashboard-layout";
export const DASHBOARD_THEME_CHANGE_EVENT = "light-gallery-dashboard-theme-change";

export function isNavigationItemActive(itemHref: string, pathname: string | null): boolean {
  if (!pathname) {
    return false;
  }

  if (itemHref === "/dashboard") {
    return pathname === itemHref;
  }

  return pathname === itemHref || pathname.startsWith(`${itemHref}/`);
}

export function resolveThemeMode(value: string | null): DashboardThemeMode {
  return value === "light" || value === "dark" ? value : DEFAULT_DASHBOARD_THEME;
}

export function resolveLayoutMode(value: string | null): DashboardLayoutMode {
  return value === "wide" || value === "narrow" ? value : DEFAULT_DASHBOARD_LAYOUT;
}

export function getNavigationTextColor(mode: DashboardThemeMode, isActive: boolean): string {
  if (mode === "light") {
    return isActive ? "rgba(37, 35, 31, 0.92)" : "rgba(37, 35, 31, 0.52)";
  }

  return isActive ? "rgba(255, 255, 255, 0.88)" : "rgba(255, 255, 255, 0.42)";
}

export type DashboardThemeMode = "dark" | "light";
export type DashboardSidebarMode = "expanded" | "collapsed";

export const DEFAULT_DASHBOARD_THEME: DashboardThemeMode = "dark";
export const DEFAULT_DASHBOARD_SIDEBAR: DashboardSidebarMode = "expanded";
export const DASHBOARD_THEME_STORAGE_KEY = "light-gallery-dashboard-theme";
export const DASHBOARD_SIDEBAR_STORAGE_KEY = "light-gallery-dashboard-sidebar";
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

export function resolveSidebarMode(value: string | null): DashboardSidebarMode {
  return value === "expanded" || value === "collapsed" ? value : DEFAULT_DASHBOARD_SIDEBAR;
}

export function getNavigationTextColor(mode: DashboardThemeMode, isActive: boolean): string {
  if (mode === "light") {
    return isActive ? "rgba(37, 35, 31, 0.92)" : "rgba(37, 35, 31, 0.52)";
  }

  return isActive ? "rgba(255, 255, 255, 0.88)" : "rgba(255, 255, 255, 0.42)";
}

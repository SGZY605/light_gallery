"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Grid2x2,
  LayoutDashboard,
  type LucideIcon,
  MapPinned,
  Settings,
  Share2,
  Tags,
  UploadCloud,
  Users
} from "lucide-react";
import {
  DASHBOARD_THEME_CHANGE_EVENT,
  DASHBOARD_THEME_STORAGE_KEY,
  DEFAULT_DASHBOARD_THEME,
  getNavigationTextColor,
  isNavigationItemActive,
  resolveThemeMode,
  type DashboardThemeMode
} from "@/components/dashboard-shell-state";

type DashboardNavProps = {
  canManageUsers: boolean;
};

type NavigationItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  requiresManager?: boolean;
};

const navigationItems: NavigationItem[] = [
  { href: "/dashboard", label: "首页", icon: LayoutDashboard },
  { href: "/dashboard/library", label: "图库", icon: Grid2x2 },
  { href: "/dashboard/upload", label: "上传", icon: UploadCloud },
  { href: "/dashboard/tags", label: "标签", icon: Tags },
  { href: "/dashboard/shares", label: "分享", icon: Share2 },
  { href: "/dashboard/map", label: "地图", icon: MapPinned },
  { href: "/dashboard/users", label: "用户", icon: Users, requiresManager: true },
  { href: "/dashboard/settings", label: "设置", icon: Settings }
];

export function DashboardNav({ canManageUsers }: DashboardNavProps) {
  const pathname = usePathname();
  const [themeMode, setThemeMode] = useState<DashboardThemeMode>(DEFAULT_DASHBOARD_THEME);

  useEffect(() => {
    setThemeMode(resolveThemeMode(window.localStorage.getItem(DASHBOARD_THEME_STORAGE_KEY)));

    function handleThemeChange(event: Event) {
      setThemeMode(resolveThemeMode((event as CustomEvent<string>).detail));
    }

    window.addEventListener(DASHBOARD_THEME_CHANGE_EVENT, handleThemeChange);
    return () => window.removeEventListener(DASHBOARD_THEME_CHANGE_EVENT, handleThemeChange);
  }, []);

  return (
    <nav className="space-y-0.5">
      {navigationItems
        .filter((item) => (item.requiresManager ? canManageUsers : true))
        .map((item) => {
          const isActive = isNavigationItemActive(item.href, pathname);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "dashboard-nav-link",
                isActive ? "dashboard-nav-link-active" : "dashboard-nav-link-muted"
              ].join(" ")}
              style={{
                color: getNavigationTextColor(themeMode, isActive)
              }}
            >
              {isActive && (
                <span className="dashboard-nav-indicator" />
              )}
              <Icon className="h-3.5 w-3.5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
    </nav>
  );
}

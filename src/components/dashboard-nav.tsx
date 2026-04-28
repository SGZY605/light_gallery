"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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

  return (
    <nav className="space-y-0.5">
      {navigationItems
        .filter((item) => (item.requiresManager ? canManageUsers : true))
        .map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "flex items-center gap-2 px-2 py-1.5 text-xs font-medium transition relative",
                isActive
                  ? "text-white/80"
                  : "text-white/30 hover:text-white/50"
              ].join(" ")}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-3 rounded-full bg-white/30" />
              )}
              <Icon className="h-3.5 w-3.5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
    </nav>
  );
}

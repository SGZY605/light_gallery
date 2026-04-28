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
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/library", label: "Library", icon: Grid2x2 },
  { href: "/dashboard/upload", label: "Upload", icon: UploadCloud },
  { href: "/dashboard/tags", label: "Tags", icon: Tags },
  { href: "/dashboard/shares", label: "Shares", icon: Share2 },
  { href: "/dashboard/map", label: "Map", icon: MapPinned },
  { href: "/dashboard/users", label: "Users", icon: Users, requiresManager: true },
  { href: "/dashboard/settings", label: "Settings", icon: Settings }
];

export function DashboardNav({ canManageUsers }: DashboardNavProps) {
  const pathname = usePathname();

  return (
    <nav className="space-y-2">
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
                "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition",
                isActive
                  ? "bg-amber-400 text-black shadow-[0_14px_30px_rgba(245,158,11,0.35)]"
                  : "text-white/50 hover:bg-white/10 hover:text-white"
              ].join(" ")}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
    </nav>
  );
}

"use client";

import { Maximize2, Minimize2, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import {
  DASHBOARD_LAYOUT_STORAGE_KEY,
  DASHBOARD_THEME_CHANGE_EVENT,
  DASHBOARD_THEME_STORAGE_KEY,
  type DashboardLayoutMode,
  type DashboardThemeMode,
  DEFAULT_DASHBOARD_LAYOUT,
  DEFAULT_DASHBOARD_THEME,
  resolveLayoutMode,
  resolveThemeMode,
  getNavigationTextColor
} from "@/components/dashboard-shell-state";

function applyThemeMode(mode: DashboardThemeMode) {
  document.documentElement.classList.toggle("dark", mode === "dark");
  document.documentElement.dataset.theme = mode;
  document.documentElement.style.colorScheme = mode;
  window.dispatchEvent(new CustomEvent(DASHBOARD_THEME_CHANGE_EVENT, { detail: mode }));
}

function applyLayoutMode(mode: DashboardLayoutMode) {
  document.documentElement.dataset.dashboardLayout = mode;
  document.querySelector<HTMLElement>("[data-dashboard-shell]")?.setAttribute("data-layout", mode);
}

export function DashboardShellControls() {
  const [themeMode, setThemeMode] = useState<DashboardThemeMode>(DEFAULT_DASHBOARD_THEME);
  const [layoutMode, setLayoutMode] = useState<DashboardLayoutMode>(DEFAULT_DASHBOARD_LAYOUT);

  useEffect(() => {
    const storedTheme = resolveThemeMode(window.localStorage.getItem(DASHBOARD_THEME_STORAGE_KEY));
    const storedLayout = resolveLayoutMode(window.localStorage.getItem(DASHBOARD_LAYOUT_STORAGE_KEY));

    setThemeMode(storedTheme);
    setLayoutMode(storedLayout);
    applyThemeMode(storedTheme);
    applyLayoutMode(storedLayout);
  }, []);

  function toggleTheme() {
    const nextMode: DashboardThemeMode = themeMode === "dark" ? "light" : "dark";

    setThemeMode(nextMode);
    window.localStorage.setItem(DASHBOARD_THEME_STORAGE_KEY, nextMode);
    applyThemeMode(nextMode);
  }

  function toggleLayout() {
    const nextMode: DashboardLayoutMode = layoutMode === "wide" ? "narrow" : "wide";

    setLayoutMode(nextMode);
    window.localStorage.setItem(DASHBOARD_LAYOUT_STORAGE_KEY, nextMode);
    applyLayoutMode(nextMode);
  }

  const ThemeIcon = themeMode === "dark" ? Sun : Moon;
  const LayoutIcon = layoutMode === "wide" ? Minimize2 : Maximize2;

  return (
    <div className="mt-auto flex items-center gap-1 border-t border-[color:var(--shell-border)] pt-3">
      <button
        type="button"
        aria-label={themeMode === "dark" ? "切换到浅色模式" : "切换到深色模式"}
        title={themeMode === "dark" ? "切换到浅色模式" : "切换到深色模式"}
        onClick={toggleTheme}
        className="dashboard-icon-button"
        style={{ color: getNavigationTextColor(themeMode, false) }}
      >
        <ThemeIcon className="h-3.5 w-3.5" />
      </button>

      <button
        type="button"
        aria-label={layoutMode === "wide" ? "切换到窄栏模式" : "切换到宽栏模式"}
        title={layoutMode === "wide" ? "切换到窄栏模式" : "切换到宽栏模式"}
        onClick={toggleLayout}
        className="dashboard-icon-button"
        style={{ color: getNavigationTextColor(themeMode, false) }}
      >
        <LayoutIcon className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

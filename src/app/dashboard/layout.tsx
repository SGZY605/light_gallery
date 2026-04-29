import { DashboardShellControls } from "@/components/dashboard-shell-controls";
import { DashboardNav } from "@/components/dashboard-nav";
import { canManageUsers } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await requireUser();
  const canOpenUsersPage = canManageUsers(user.role);

  return (
    <div className="dashboard-root min-h-screen bg-[color:var(--page-bg)] text-[color:var(--text-primary)]">
      <div
        data-dashboard-shell
        data-sidebar="expanded"
        className="dashboard-shell flex min-h-screen w-full flex-col xl:flex-row"
      >
        <aside className="dashboard-sidebar flex flex-col items-center border-b border-[color:var(--shell-border)] bg-[color:var(--shell-bg)] px-2 py-4 text-center text-[color:var(--text-primary)] xl:min-h-screen xl:w-32 xl:border-b-0 xl:border-r">
          <div className="dashboard-shell-brand mb-6 w-full space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[color:var(--shell-caption)]">光影画廊</p>
            <p className="text-[10px] leading-relaxed text-[color:var(--shell-subtle)]">
              已登录为 {user.name}
            </p>
          </div>

          <DashboardNav canManageUsers={canOpenUsersPage} />

          <div className="flex-1" />

          <form action="/api/auth/logout" method="post" className="dashboard-logout mb-3 w-full">
            <button
              type="submit"
              className="w-full px-2 py-1 text-center text-[10px] font-medium text-[color:var(--shell-nav-muted)] transition hover:text-[color:var(--shell-nav-hover)]"
            >
              退出登录
            </button>
          </form>

          <DashboardShellControls />
        </aside>

        <main className="flex-1 px-4 py-4 sm:px-6 xl:px-7 xl:py-6">{children}</main>
      </div>
    </div>
  );
}

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
    <div className="min-h-screen bg-black">
      <div className="mx-auto flex min-h-screen max-w-[1500px] flex-col xl:flex-row">
        <aside className="border-b border-white/[0.04] bg-[#050505] px-3 py-4 text-white xl:min-h-screen xl:w-48 xl:border-b-0 xl:border-r">
          <div className="mb-6 space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/20">光影画廊</p>
            <p className="text-[10px] leading-relaxed text-white/30">
              已登录为 {user.name}
            </p>
          </div>

          <DashboardNav canManageUsers={canOpenUsersPage} />

          <form action="/api/auth/logout" method="post" className="mt-6">
            <button
              type="submit"
              className="w-full px-2 py-1 text-[10px] font-medium text-white/20 transition hover:text-white/40"
            >
              退出登录
            </button>
          </form>
        </aside>

        <main className="flex-1 px-4 py-4 sm:px-6 xl:px-8 xl:py-6">{children}</main>
      </div>
    </div>
  );
}

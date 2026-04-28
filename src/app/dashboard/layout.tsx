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
        <aside className="border-b border-border bg-surface px-6 py-8 text-white xl:min-h-screen xl:w-[320px] xl:border-b-0 xl:border-r">
          <div className="mb-10 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.36em] text-amber-300">Light Gallery</p>
            <h1 className="text-2xl font-semibold leading-tight">Private photo storage with fast curation workflows.</h1>
            <p className="text-sm leading-6 text-white/50">
              Signed in as {user.name} ({user.role.toLowerCase()}).
            </p>
          </div>

          <DashboardNav canManageUsers={canOpenUsersPage} />

          <form action="/api/auth/logout" method="post" className="mt-10">
            <button
              type="submit"
              className="w-full rounded-2xl border border-white/15 px-4 py-3 text-sm font-semibold text-white/70 transition hover:border-white/35 hover:bg-white/10 hover:text-white"
            >
              Sign out
            </button>
          </form>
        </aside>

        <main className="flex-1 px-5 py-6 sm:px-8 xl:px-10 xl:py-10">{children}</main>
      </div>
    </div>
  );
}

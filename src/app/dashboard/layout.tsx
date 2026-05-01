import Image from "next/image";
import { DashboardShellControls } from "@/components/dashboard-shell-controls";
import { DashboardNav } from "@/components/dashboard-nav";
import { ImageDetailScrollRestorer } from "@/components/image-detail-scroll-restorer";
import { OssConfigRequiredNotice } from "@/components/oss-config-required-notice";
import { canManageUsers } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { resolveUserOssConfig } from "@/lib/oss/user-config";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await requireUser();
  const canOpenUsersPage = canManageUsers(user.role);
  const ossConfig = await resolveUserOssConfig({ user });

  return (
    <div className="dashboard-root h-screen overflow-hidden bg-[color:var(--page-bg)] text-[color:var(--text-primary)]">
      <div
        data-dashboard-shell
        data-sidebar="expanded"
        className="dashboard-shell flex h-full w-full flex-col xl:flex-row"
      >
        <aside className="dashboard-sidebar shrink-0 flex flex-col items-center border-b border-[color:var(--shell-border)] bg-[color:var(--shell-bg)] px-2 py-4 text-center text-[color:var(--text-primary)] xl:h-full xl:w-40 xl:border-b-0 xl:border-r xl:min-h-0">
          <div className="dashboard-shell-brand mb-7 w-full">
            <div className="dashboard-brand-mark" aria-label="光影画廊">
              <Image
                src="/brand/gallery_light.png"
                alt=""
                width={2048}
                height={2048}
                priority
                className="dashboard-brand-image dashboard-brand-image-light"
              />
              <Image
                src="/brand/gallery_dark.png"
                alt=""
                width={2048}
                height={2048}
                priority
                className="dashboard-brand-image dashboard-brand-image-dark"
              />
            </div>
          </div>

          <DashboardNav canManageUsers={canOpenUsersPage} />

          <div className="flex-1" />

          <p className="dashboard-login-caption mb-2 w-full px-2 text-[10px] leading-relaxed text-[color:var(--shell-subtle)]">
            已登录为 {user.name}
          </p>

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

        <main
          data-dashboard-content
          className="flex-1 min-h-0 overflow-y-auto px-4 py-4 sm:px-6 xl:px-7 xl:py-6"
        >
          <ImageDetailScrollRestorer />
          {!ossConfig ? <OssConfigRequiredNotice /> : null}
          {children}
        </main>
      </div>
    </div>
  );
}

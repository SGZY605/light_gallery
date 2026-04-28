import { UserRole } from "@prisma/client";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { canManageUsers } from "@/lib/auth/permissions";
import { hashPassword, MIN_PASSWORD_LENGTH, normalizeEmail } from "@/lib/auth/password";
import { canChangeUserRole, canDeleteUserAccount, PROTECTED_ADMIN_EMAIL } from "@/lib/auth/protected-admin";
import { getExpiredSessionCookie, requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const roleLabels: Record<UserRole, string> = {
  ADMIN: "管理员",
  MEMBER: "成员"
};

const roleOptions = [UserRole.ADMIN, UserRole.MEMBER] as const;

async function requireManagingUser() {
  const user = await requireUser();

  if (!canManageUsers(user.role)) {
    redirect("/dashboard");
  }

  return user;
}

async function createUserAction(formData: FormData) {
  "use server";

  await requireManagingUser();

  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const name = String(formData.get("name") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const roleValue = String(formData.get("role") ?? UserRole.MEMBER);
  const role = roleOptions.includes(roleValue as UserRole) ? (roleValue as UserRole) : UserRole.MEMBER;

  if (!email || !name || password.length < MIN_PASSWORD_LENGTH) {
    return;
  }

  const existingUser = await db.user.findUnique({
    where: {
      email
    }
  });

  if (existingUser) {
    return;
  }

  await db.user.create({
    data: {
      email,
      name,
      passwordHash: await hashPassword(password),
      role
    }
  });

  revalidatePath("/dashboard/users");
}

async function updateUserRoleAction(formData: FormData) {
  "use server";

  await requireManagingUser();

  const userId = String(formData.get("userId") ?? "");
  const roleValue = String(formData.get("role") ?? UserRole.MEMBER);

  if (!userId || !roleOptions.includes(roleValue as UserRole)) {
    return;
  }

  const targetUser = await db.user.findUnique({
    where: {
      id: userId
    },
    select: {
      email: true
    }
  });

  if (!targetUser || !canChangeUserRole(targetUser.email, roleValue as UserRole)) {
    return;
  }

  await db.user.update({
    where: {
      id: userId
    },
    data: {
      role: roleValue as UserRole
    }
  });

  revalidatePath("/dashboard/users");
}

async function resetUserPasswordAction(formData: FormData) {
  "use server";

  await requireManagingUser();

  const userId = String(formData.get("userId") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!userId || password.length < MIN_PASSWORD_LENGTH) {
    return;
  }

  await db.user.update({
    where: {
      id: userId
    },
    data: {
      passwordHash: await hashPassword(password)
    }
  });

  revalidatePath("/dashboard/users");
}

async function deleteUserAction(formData: FormData) {
  "use server";

  const currentUser = await requireManagingUser();
  const userId = String(formData.get("userId") ?? "");

  if (!userId) {
    return;
  }

  const [targetUser, protectedAdmin] = await Promise.all([
    db.user.findUnique({
      where: {
        id: userId
      },
      select: {
        id: true,
        email: true
      }
    }),
    db.user.findUnique({
      where: {
        email: PROTECTED_ADMIN_EMAIL
      },
      select: {
        id: true
      }
    })
  ]);

  if (!targetUser || !protectedAdmin || !canDeleteUserAccount(targetUser.email)) {
    return;
  }

  await db.$transaction(async (tx) => {
    await Promise.all([
      tx.image.updateMany({
        where: { uploaderId: targetUser.id },
        data: { uploaderId: protectedAdmin.id }
      }),
      tx.tag.updateMany({
        where: { creatorId: targetUser.id },
        data: { creatorId: protectedAdmin.id }
      }),
      tx.share.updateMany({
        where: { creatorId: targetUser.id },
        data: { creatorId: protectedAdmin.id }
      }),
      tx.uploadSession.updateMany({
        where: { creatorId: targetUser.id },
        data: { creatorId: protectedAdmin.id }
      }),
      tx.imageLocationOverride.updateMany({
        where: { updatedById: targetUser.id },
        data: { updatedById: protectedAdmin.id }
      }),
      tx.auditLog.updateMany({
        where: { actorId: targetUser.id },
        data: { actorId: protectedAdmin.id }
      })
    ]);

    await tx.user.delete({
      where: {
        id: targetUser.id
      }
    });
  });

  if (targetUser.id === currentUser.id) {
    const cookieStore = await cookies();
    const expiredSession = getExpiredSessionCookie();
    cookieStore.set(expiredSession.name, expiredSession.value, expiredSession.options);
    redirect("/login");
  }

  revalidatePath("/dashboard/users");
}

export default async function DashboardUsersPage() {
  const currentUser = await requireManagingUser();
  const users = await db.user.findMany({
    orderBy: [
      {
        role: "asc"
      },
      {
        createdAt: "asc"
      }
    ]
  });

  return (
    <div className="space-y-8">
      <section className="rounded-[32px] border border-slate-200 bg-white px-7 py-7 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-400">用户</p>
        <h2 className="mt-3 text-3xl font-semibold text-slate-950">管理允许进入图库的私有账户。</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          管理员可以创建账户、调整角色、重置任意密码，并删除除超级管理员外的账户。超级管理员固定为
          {" "}
          {PROTECTED_ADMIN_EMAIL}
          ，不能删除，也不能降级为普通成员。
        </p>
      </section>

      <section className="rounded-[32px] border border-slate-200 bg-white p-7 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-amber-600">创建账户</p>
          <h3 className="mt-2 text-2xl font-semibold text-slate-950">添加新的管理员或成员</h3>
          <p className="mt-3 text-sm leading-6 text-slate-600">新密码至少 {MIN_PASSWORD_LENGTH} 位。</p>
        </div>

        <form action={createUserAction} className="mt-6 grid gap-4 xl:grid-cols-4">
          <input
            name="name"
            placeholder="名称"
            className="rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
          />
          <input
            name="email"
            type="email"
            placeholder="邮箱"
            className="rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
          />
          <input
            name="password"
            type="password"
            placeholder="初始密码"
            className="rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
          />
          <div className="flex gap-3">
            <select
              name="role"
              defaultValue={UserRole.MEMBER}
              className="min-w-0 flex-1 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
            >
              {roleOptions.map((role) => (
                <option key={role} value={role}>
                  {roleLabels[role]}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              创建
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-[32px] border border-slate-200 bg-white p-7 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
        <div className="border-b border-slate-200 pb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-400">账户</p>
          <h3 className="mt-2 text-2xl font-semibold text-slate-950">现有用户</h3>
        </div>

        <div className="mt-6 space-y-4">
          {users.map((user) => {
            const isProtectedAdmin = user.email === PROTECTED_ADMIN_EMAIL;

            return (
              <article key={user.id} className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                <div className="flex flex-wrap items-start justify-between gap-6">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-lg font-semibold text-slate-950">{user.name}</h4>
                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                        {roleLabels[user.role]}
                      </span>
                      {isProtectedAdmin ? (
                        <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                          超级管理员
                        </span>
                      ) : null}
                      {user.id === currentUser.id ? (
                        <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                          当前账号
                        </span>
                      ) : null}
                    </div>
                    <p className="text-sm text-slate-500">{user.email}</p>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                      创建于 {new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium" }).format(user.createdAt)}
                    </p>
                  </div>

                  <div className="flex min-w-full flex-col gap-3 xl:min-w-[680px]">
                    <form action={updateUserRoleAction} className="flex flex-wrap items-center gap-3">
                      <input type="hidden" name="userId" value={user.id} />
                      <select
                        name="role"
                        defaultValue={user.role}
                        disabled={isProtectedAdmin}
                        className="rounded-full border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 outline-none transition focus:border-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100"
                      >
                        {roleOptions.map((role) => (
                          <option key={role} value={role}>
                            {roleLabels[role]}
                          </option>
                        ))}
                      </select>
                      <button
                        type="submit"
                        disabled={isProtectedAdmin}
                        className="rounded-full border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-950 hover:text-slate-950 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                      >
                        更新角色
                      </button>
                      {isProtectedAdmin ? (
                        <p className="text-xs text-slate-500">超级管理员始终保持管理员角色。</p>
                      ) : null}
                    </form>

                    <form action={resetUserPasswordAction} className="flex flex-wrap items-center gap-3">
                      <input type="hidden" name="userId" value={user.id} />
                      <input
                        name="password"
                        type="password"
                        placeholder="输入新密码"
                        className="min-w-[220px] flex-1 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm text-slate-950 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                      />
                      <button
                        type="submit"
                        className="rounded-full border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-950 hover:text-slate-950"
                      >
                        重置密码
                      </button>
                    </form>

                    <div className="flex flex-wrap items-center gap-3">
                      {canDeleteUserAccount(user.email) ? (
                        <form action={deleteUserAction}>
                          <input type="hidden" name="userId" value={user.id} />
                          <button
                            type="submit"
                            className="rounded-full border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 transition hover:border-red-400"
                          >
                            删除账户
                          </button>
                        </form>
                      ) : (
                        <p className="text-xs text-slate-500">超级管理员账户受保护，不能删除。</p>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

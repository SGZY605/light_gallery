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
    <div className="space-y-4">
      <section>
        <h2 className="text-base font-semibold text-white/40">用户</h2>
        <p className="mt-1 text-xs text-white/20">
          管理允许访问画廊的私有账户，超级管理员固定为 {PROTECTED_ADMIN_EMAIL}。
        </p>
      </section>

      <section className="border-t border-white/[0.04] pt-4">
        <h3 className="text-sm font-semibold text-white/30">创建账户</h3>
        <p className="mt-1 text-[10px] text-white/15">密码至少 {MIN_PASSWORD_LENGTH} 位。</p>

        <form action={createUserAction} className="mt-3 flex flex-wrap items-end gap-2">
          <input
            name="name"
            placeholder="姓名"
            className="bg-transparent py-1 text-xs text-white/50 placeholder:text-white/15 outline-none border-b border-white/[0.04] transition focus:border-white/10"
          />
          <input
            name="email"
            type="email"
            placeholder="Email"
            className="bg-transparent py-1 text-xs text-white/50 placeholder:text-white/15 outline-none border-b border-white/[0.04] transition focus:border-white/10"
          />
          <input
            name="password"
            type="password"
            placeholder="Password"
            className="bg-transparent py-1 text-xs text-white/50 placeholder:text-white/15 outline-none border-b border-white/[0.04] transition focus:border-white/10"
          />
          <select
            name="role"
            defaultValue={UserRole.MEMBER}
            className="bg-transparent py-1 text-xs text-white/50 outline-none border-b border-white/[0.04] transition focus:border-white/10"
          >
            {roleOptions.map((role) => (
              <option key={role} value={role}>
                {roleLabels[role]}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="px-3 py-1 text-xs font-medium text-white/30 transition hover:text-white/50"
          >
            Create
          </button>
        </form>
      </section>

      <section className="border-t border-white/[0.04] pt-4">
        <h3 className="text-sm font-semibold text-white/30">现有用户</h3>

        <div className="mt-3 space-y-2">
          {users.map((user) => {
            const isProtectedAdmin = user.email === PROTECTED_ADMIN_EMAIL;

            return (
              <article key={user.id} className="border-b border-white/[0.02] pb-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm font-medium text-white/50">{user.name}</h4>
                      <span className="text-[10px] text-white/20">{roleLabels[user.role]}</span>
                      {isProtectedAdmin ? <span className="text-[10px] text-amber-400/50">超级管理员</span> : null}
                      {user.id === currentUser.id ? <span className="text-[10px] text-white/15">当前账号</span> : null}
                    </div>
                    <p className="text-[10px] text-white/25">{user.email}</p>
                    <p className="mt-1 text-[10px] text-white/15">
                      created {new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(user.createdAt)}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <form action={updateUserRoleAction} className="flex items-center gap-1.5">
                      <input type="hidden" name="userId" value={user.id} />
                      <select
                        name="role"
                        defaultValue={user.role}
                        disabled={isProtectedAdmin}
                        className="bg-transparent py-1 text-[10px] text-white/40 outline-none border-b border-white/[0.04] transition focus:border-white/10 disabled:cursor-not-allowed disabled:text-white/15"
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
                        className="px-1.5 py-0.5 text-[10px] text-white/30 transition hover:text-white/50 disabled:cursor-not-allowed disabled:text-white/10"
                      >
                        Update
                      </button>
                    </form>

                    <form action={resetUserPasswordAction} className="flex items-center gap-1.5">
                      <input type="hidden" name="userId" value={user.id} />
                      <input
                        name="password"
                        type="password"
                        placeholder="New password"
                        className="w-28 bg-transparent py-1 text-[10px] text-white/40 placeholder:text-white/10 outline-none border-b border-white/[0.04] transition focus:border-white/10"
                      />
                      <button
                        type="submit"
                        className="px-1.5 py-0.5 text-[10px] text-white/30 transition hover:text-white/50"
                      >
                        Reset
                      </button>
                    </form>

                    {canDeleteUserAccount(user.email) ? (
                      <form action={deleteUserAction}>
                        <input type="hidden" name="userId" value={user.id} />
                        <button
                          type="submit"
                          className="px-1.5 py-0.5 text-[10px] text-red-400/50 transition hover:text-red-400/80"
                        >
                          Delete
                        </button>
                      </form>
                    ) : null}
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

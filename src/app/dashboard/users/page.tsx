import { UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { canManageUsers } from "@/lib/auth/permissions";
import { hashPassword, normalizeEmail } from "@/lib/auth/password";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

async function createUserAction(formData: FormData) {
  "use server";

  const user = await requireUser();

  if (!canManageUsers(user.role)) {
    redirect("/dashboard");
  }

  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const name = String(formData.get("name") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const roleValue = String(formData.get("role") ?? "MEMBER");
  const role = Object.values(UserRole).includes(roleValue as UserRole) ? (roleValue as UserRole) : UserRole.MEMBER;

  if (!email || !name || password.length < 8) {
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

  const user = await requireUser();

  if (!canManageUsers(user.role)) {
    redirect("/dashboard");
  }

  const userId = String(formData.get("userId") ?? "");
  const roleValue = String(formData.get("role") ?? UserRole.MEMBER);

  if (!userId || !Object.values(UserRole).includes(roleValue as UserRole)) {
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

async function disableUserAction(formData: FormData) {
  "use server";

  const user = await requireUser();

  if (!canManageUsers(user.role)) {
    redirect("/dashboard");
  }

  const userId = String(formData.get("userId") ?? "");

  if (!userId || userId === user.id) {
    return;
  }

  await db.user.update({
    where: {
      id: userId
    },
    data: {
      status: "DISABLED"
    }
  });

  revalidatePath("/dashboard/users");
}

export default async function DashboardUsersPage() {
  const currentUser = await requireUser();

  if (!canManageUsers(currentUser.role)) {
    redirect("/dashboard");
  }

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
          管理允许访问画廊的私有账户。
        </p>
      </section>

      <section className="border-t border-white/[0.04] pt-4">
        <h3 className="text-sm font-semibold text-white/30">创建账户</h3>

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
            {Object.values(UserRole).map((role) => (
              <option key={role} value={role}>
                {role}
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
          {users.map((user) => (
            <article key={user.id} className="border-b border-white/[0.02] pb-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h4 className="text-sm font-medium text-white/50">{user.name}</h4>
                  <p className="text-[10px] text-white/25">{user.email}</p>
                  <p className="mt-1 text-[10px] text-white/15">
                    {user.status.toLowerCase()} • created {new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(user.createdAt)}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <form action={updateUserRoleAction} className="flex items-center gap-1.5">
                    <input type="hidden" name="userId" value={user.id} />
                    <select
                      name="role"
                      defaultValue={user.role}
                      className="bg-transparent py-1 text-[10px] text-white/40 outline-none border-b border-white/[0.04] transition focus:border-white/10"
                    >
                      {Object.values(UserRole).map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      className="px-1.5 py-0.5 text-[10px] text-white/30 transition hover:text-white/50"
                    >
                      Update
                    </button>
                  </form>

                  {user.id !== currentUser.id && user.status !== "DISABLED" ? (
                    <form action={disableUserAction}>
                      <input type="hidden" name="userId" value={user.id} />
                      <button
                        type="submit"
                        className="px-1.5 py-0.5 text-[10px] text-red-400/50 transition hover:text-red-400/80"
                      >
                        Disable
                      </button>
                    </form>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

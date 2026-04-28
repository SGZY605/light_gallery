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
    <div className="space-y-8">
      <section className="rounded-[32px] border border-slate-200 bg-white px-7 py-7 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-400">Users</p>
        <h2 className="mt-3 text-3xl font-semibold text-slate-950">Manage the small set of private accounts allowed into the gallery.</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          Owners and admins can create users, adjust roles, and disable accounts. Members are kept out of this page entirely.
        </p>
      </section>

      <section className="rounded-[32px] border border-slate-200 bg-white p-7 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-amber-600">Create account</p>
          <h3 className="mt-2 text-2xl font-semibold text-slate-950">Add a new private user</h3>
        </div>

        <form action={createUserAction} className="mt-6 grid gap-4 xl:grid-cols-4">
          <input
            name="name"
            placeholder="Name"
            className="rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
          />
          <input
            name="email"
            type="email"
            placeholder="Email"
            className="rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
          />
          <input
            name="password"
            type="password"
            placeholder="Password"
            className="rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
          />
          <div className="flex gap-3">
            <select
              name="role"
              defaultValue={UserRole.MEMBER}
              className="min-w-0 flex-1 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
            >
              {Object.values(UserRole).map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Create
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-[32px] border border-slate-200 bg-white p-7 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
        <div className="border-b border-slate-200 pb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-400">Accounts</p>
          <h3 className="mt-2 text-2xl font-semibold text-slate-950">Existing users</h3>
        </div>

        <div className="mt-6 space-y-4">
          {users.map((user) => (
            <article key={user.id} className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h4 className="text-lg font-semibold text-slate-950">{user.name}</h4>
                  <p className="mt-1 text-sm text-slate-500">{user.email}</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.2em] text-slate-400">
                    {user.status.toLowerCase()} • created {new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(user.createdAt)}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <form action={updateUserRoleAction} className="flex items-center gap-2">
                    <input type="hidden" name="userId" value={user.id} />
                    <select
                      name="role"
                      defaultValue={user.role}
                      className="rounded-full border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 outline-none transition focus:border-slate-900"
                    >
                      {Object.values(UserRole).map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      className="rounded-full border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-950 hover:text-slate-950"
                    >
                      Update role
                    </button>
                  </form>

                  {user.id !== currentUser.id && user.status !== "DISABLED" ? (
                    <form action={disableUserAction}>
                      <input type="hidden" name="userId" value={user.id} />
                      <button
                        type="submit"
                        className="rounded-full border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 transition hover:border-red-400"
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

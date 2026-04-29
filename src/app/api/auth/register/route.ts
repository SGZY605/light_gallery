import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { createSessionCookie } from "@/lib/auth/session";
import { hashPassword, MIN_PASSWORD_LENGTH, normalizeEmail } from "@/lib/auth/password";
import { isRegistrationAllowed } from "@/lib/settings";
import { db } from "@/lib/db";

export async function GET() {
  const allowed = await isRegistrationAllowed();
  return NextResponse.json({ allowed });
}

export async function POST(request: Request) {
  const allowed = await isRegistrationAllowed();

  if (!allowed) {
    return NextResponse.json({ error: "注册未开放。" }, { status: 403 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误。" }, { status: 400 });
  }

  const { email, password, name } = body as {
    email?: unknown;
    password?: unknown;
    name?: unknown;
  };

  if (typeof email !== "string" || typeof password !== "string" || typeof name !== "string") {
    return NextResponse.json({ error: "请填写完整信息。" }, { status: 400 });
  }

  const trimmedName = name.trim();
  if (!trimmedName) {
    return NextResponse.json({ error: "请输入姓名。" }, { status: 400 });
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json({ error: `密码至少 ${MIN_PASSWORD_LENGTH} 位。` }, { status: 400 });
  }

  const normalizedEmail = normalizeEmail(email);

  const existingUser = await db.user.findUnique({
    where: { email: normalizedEmail }
  });

  if (existingUser) {
    return NextResponse.json({ error: "该邮箱已被注册。" }, { status: 409 });
  }

  const user = await db.user.create({
    data: {
      email: normalizedEmail,
      name: trimmedName,
      passwordHash: await hashPassword(password),
      role: UserRole.MEMBER
    }
  });

  const session = await createSessionCookie(user.id, request);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(session.name, session.value, session.options);

  return response;
}

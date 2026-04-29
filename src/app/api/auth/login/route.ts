import { NextResponse } from "next/server";
import { createSessionCookie } from "@/lib/auth/session";
import { normalizeEmail, verifyPassword } from "@/lib/auth/password";
import { db } from "@/lib/db";

const INVALID_CREDENTIALS = "邮箱或密码错误。";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: INVALID_CREDENTIALS }, { status: 400 });
  }

  const { email, password } = body as { email?: unknown; password?: unknown };

  if (typeof email !== "string" || typeof password !== "string") {
    return NextResponse.json({ error: INVALID_CREDENTIALS }, { status: 400 });
  }

  const user = await db.user.findUnique({
    where: { email: normalizeEmail(email) }
  });

  if (!user) {
    return NextResponse.json({ error: INVALID_CREDENTIALS }, { status: 401 });
  }

  const validPassword = await verifyPassword(password, user.passwordHash);

  if (!validPassword) {
    return NextResponse.json({ error: INVALID_CREDENTIALS }, { status: 401 });
  }

  const session = await createSessionCookie(user.id, request);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(session.name, session.value, session.options);

  return response;
}

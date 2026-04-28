import { NextResponse } from "next/server";
import { getExpiredSessionCookie } from "@/lib/auth/session";

export async function POST() {
  const session = getExpiredSessionCookie();
  const response = NextResponse.json({ ok: true });
  response.cookies.set(session.name, session.value, session.options);

  return response;
}

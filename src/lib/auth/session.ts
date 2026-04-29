import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { User } from "@prisma/client";
import { db } from "@/lib/db";

export const SESSION_COOKIE_NAME = "light_gallery_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7;

type SessionPayload = {
  sub: string;
};

type SessionCookie = {
  name: string;
  value: string;
  options: {
    httpOnly: true;
    sameSite: "lax";
    secure: boolean;
    path: "/";
    maxAge: number;
  };
};

type SessionCookieSecureInput = {
  nodeEnv?: string;
  requestUrl?: string;
  forwardedProto?: string | null;
  explicitSecure?: string | null;
};

function getSessionSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;

  if (!secret) {
    throw new Error("SESSION_SECRET is required");
  }

  return new TextEncoder().encode(secret);
}

function normalizeBoolean(value: string | null | undefined): boolean | null {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = value.trim().toLowerCase();

  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  return null;
}

export function resolveSessionCookieSecure({
  nodeEnv = process.env.NODE_ENV,
  requestUrl,
  forwardedProto,
  explicitSecure = process.env.SESSION_COOKIE_SECURE
}: SessionCookieSecureInput = {}): boolean {
  const explicitValue = normalizeBoolean(explicitSecure);

  if (explicitValue !== null) {
    return explicitValue;
  }

  const proto = forwardedProto?.split(",")[0]?.trim().toLowerCase();

  if (proto) {
    return proto === "https";
  }

  if (requestUrl) {
    try {
      return new URL(requestUrl).protocol === "https:";
    } catch {
      return false;
    }
  }

  return nodeEnv === "production";
}

function getRequestCookieSecure(request?: Request): boolean {
  return resolveSessionCookieSecure({
    nodeEnv: process.env.NODE_ENV,
    requestUrl: request?.url,
    forwardedProto: request?.headers.get("x-forwarded-proto"),
    explicitSecure: process.env.SESSION_COOKIE_SECURE
  });
}

export async function createSessionCookie(userId: string, request?: Request): Promise<SessionCookie> {
  const value = await new SignJWT({ sub: userId } satisfies SessionPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getSessionSecret());

  return {
    name: SESSION_COOKIE_NAME,
    value,
    options: {
      httpOnly: true,
      sameSite: "lax",
      secure: getRequestCookieSecure(request),
      path: "/",
      maxAge: SESSION_DURATION_SECONDS
    }
  };
}

export async function readSession(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, getSessionSecret());
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<User | null> {
  const userId = await readSession();

  if (!userId) {
    return null;
  }

  const user = await db.user.findUnique({
    where: { id: userId }
  });

  if (!user) {
    return null;
  }

  return user;
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export function getExpiredSessionCookie(request?: Request) {
  return {
    name: SESSION_COOKIE_NAME,
    value: "",
    options: {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: getRequestCookieSecure(request),
      path: "/" as const,
      maxAge: 0
    }
  };
}

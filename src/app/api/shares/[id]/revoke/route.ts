import { NextResponse } from "next/server";
import { canRevokeShare } from "@/lib/auth/permissions";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_request: Request, { params }: RouteContext) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!canRevokeShare(user.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const share = await db.share.update({
    where: {
      id
    },
    data: {
      revoked: true,
      revokedAt: new Date()
    }
  });

  return NextResponse.json({
    share: {
      id: share.id,
      revoked: share.revoked,
      revokedAt: share.revokedAt
    }
  });
}

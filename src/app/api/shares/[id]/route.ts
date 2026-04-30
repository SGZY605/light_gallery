import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getShareState } from "@/lib/shares/tokens";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function DELETE(_request: Request, { params }: RouteContext) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const share = await db.share.findFirst({
    where: {
      creatorId: user.id,
      id
    }
  });

  if (!share) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const shareState = getShareState(share);

  if (shareState === "active") {
    return NextResponse.json({ error: "share_still_active" }, { status: 400 });
  }

  await db.share.delete({
    where: {
      id: share.id
    }
  });

  return NextResponse.json({ deleted: true });
}

import { NextResponse } from "next/server";
import { canManageUsers } from "@/lib/auth/permissions";
import { getCurrentUser } from "@/lib/auth/session";

export async function POST() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!canManageUsers(user.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  return NextResponse.json(
    {
      error: "metadata_writeback_not_implemented",
      message:
        "EXIF writeback is reserved for a future version. Current edits are stored as application metadata."
    },
    { status: 501 }
  );
}

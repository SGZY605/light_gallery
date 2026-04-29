import { NextResponse } from "next/server";
import { canManageUsers } from "@/lib/auth/permissions";
import { getCurrentUser } from "@/lib/auth/session";

export async function POST() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "请先登录。" }, { status: 401 });
  }

  if (!canManageUsers(user.role)) {
    return NextResponse.json({ error: "没有执行此操作的权限。" }, { status: 403 });
  }

  return NextResponse.json(
    {
      error: "metadata_writeback_not_implemented",
      message: "EXIF 回写功能保留给后续版本。当前编辑内容只会保存为应用元数据。"
    },
    { status: 501 }
  );
}

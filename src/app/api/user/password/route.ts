import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { verifyPassword, hashPassword, MIN_PASSWORD_LENGTH } from "@/lib/auth/password";

export async function PUT(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  let body: { currentPassword?: string; newPassword?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求格式无效" }, { status: 400 });
  }

  const { currentPassword, newPassword } = body;

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "请填写所有字段" }, { status: 400 });
  }

  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json(
      { error: `新密码长度至少 ${MIN_PASSWORD_LENGTH} 个字符` },
      { status: 400 }
    );
  }

  if (currentPassword === newPassword) {
    return NextResponse.json({ error: "新密码不能与原密码相同" }, { status: 400 });
  }

  // 获取用户密码哈希
  const fullUser = await db.user.findUnique({
    where: { id: user.id },
    select: { passwordHash: true }
  });

  if (!fullUser) {
    return NextResponse.json({ error: "用户不存在" }, { status: 404 });
  }

  // 验证原密码
  const isValid = await verifyPassword(currentPassword, fullUser.passwordHash);
  if (!isValid) {
    return NextResponse.json({ error: "原密码错误" }, { status: 400 });
  }

  // 更新密码
  const newHash = await hashPassword(newPassword);
  await db.user.update({
    where: { id: user.id },
    data: { passwordHash: newHash }
  });

  return NextResponse.json({ success: true });
}

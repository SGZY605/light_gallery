"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type PasswordFormState = {
  error?: string;
  success?: boolean;
};

export function ChangePasswordForm() {
  const router = useRouter();
  const [state, setState] = useState<PasswordFormState>({});
  const [loading, setLoading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState({});
    setLoading(true);

    // 客户端校验
    if (!currentPassword || !newPassword || !confirmPassword) {
      setState({ error: "请填写所有字段" });
      setLoading(false);
      return;
    }

    if (newPassword.length < 5) {
      setState({ error: "新密码长度至少 5 个字符" });
      setLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setState({ error: "两次输入的新密码不一致" });
      setLoading(false);
      return;
    }

    if (currentPassword === newPassword) {
      setState({ error: "新密码不能与原密码相同" });
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/user/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword })
      });

      const data = await res.json();

      if (!res.ok) {
        setState({ error: data.error || "修改密码失败" });
        return;
      }

      setState({ success: true });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      router.refresh();
    } catch {
      setState({ error: "网络错误，请稍后重试" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex items-end gap-4">
        <label className="flex-1 space-y-1">
          <span className="text-[10px] text-white/25">原密码</span>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="当前密码"
            required
            className="w-full border-b border-white/[0.06] bg-transparent py-1.5 text-xs text-white/60 outline-none transition placeholder:text-white/15 focus:border-white/20"
          />
        </label>

        <label className="flex-1 space-y-1">
          <span className="text-[10px] text-white/25">新密码</span>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="新密码（至少 5 位）"
            required
            className="w-full border-b border-white/[0.06] bg-transparent py-1.5 text-xs text-white/60 outline-none transition placeholder:text-white/15 focus:border-white/20"
          />
        </label>

        <label className="flex-1 space-y-1">
          <span className="text-[10px] text-white/25">确认新密码</span>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="再次输入新密码"
            required
            className="w-full border-b border-white/[0.06] bg-transparent py-1.5 text-xs text-white/60 outline-none transition placeholder:text-white/15 focus:border-white/20"
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="shrink-0 border-b border-white/[0.06] pb-1.5 text-xs font-semibold text-white/50 transition hover:text-white/80 disabled:opacity-50"
        >
          {loading ? "保存中..." : "确认修改"}
        </button>
      </div>

      {state.error && (
        <p className="mt-2 text-[11px] text-red-400/80">{state.error}</p>
      )}

      {state.success && (
        <p className="mt-2 text-[11px] text-green-400/80">密码修改成功</p>
      )}
    </form>
  );
}

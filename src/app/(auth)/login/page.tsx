"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registrationAllowed, setRegistrationAllowed] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regError, setRegError] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);

  const overlayRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const mouseRef = useRef({ x: -9999, y: -9999 });

  const DARK_OVERLAY = "rgba(20,20,20,0.82)";

  const updateOverlay = useCallback(() => {
    const el = overlayRef.current;
    if (!el) return;
    const { x, y } = mouseRef.current;
    if (x < 0 && y < 0) {
      el.style.background = DARK_OVERLAY;
    } else {
      el.style.background = `radial-gradient(circle 380px at ${x}px ${y}px, transparent 0%, transparent 55%, ${DARK_OVERLAY} 100%)`;
    }
  }, []);

  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      mouseRef.current = { x: e.clientX, y: e.clientY };
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(updateOverlay);
    }

    function handleMouseLeave() {
      mouseRef.current = { x: -9999, y: -9999 };
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(updateOverlay);
    }

    window.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseleave", handleMouseLeave);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
      cancelAnimationFrame(rafRef.current);
    };
  }, [updateOverlay]);

  useEffect(() => {
    fetch("/api/auth/register")
      .then((res) => res.json())
      .then((data: { allowed: boolean }) => setRegistrationAllowed(data.allowed))
      .catch(() => {});
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        const result = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(result?.error ?? "无法登录。");
        return;
      }

      router.push("/dashboard/library");
      router.refresh();
    } catch {
      setError("无法登录，请检查网络连接后重试。");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRegError(null);
    setIsRegistering(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: regEmail, password: regPassword, name: regName })
      });

      if (!response.ok) {
        const result = (await response.json().catch(() => null)) as { error?: string } | null;
        setRegError(result?.error ?? "注册失败。");
        return;
      }

      router.push("/dashboard/library");
      router.refresh();
    } catch {
      setRegError("注册失败，请检查网络连接后重试。");
    } finally {
      setIsRegistering(false);
    }
  }

  useEffect(() => {
    document.body.style.background = "transparent";
    return () => {
      document.body.style.background = "";
    };
  }, []);

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden">
      {/* 背景图片 */}
      <div
        className="fixed inset-0 z-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/login_background.png')" }}
      />

      {/* 暗色遮罩 + 鼠标光 spotlight */}
      <div
        ref={overlayRef}
        className="fixed inset-0 z-[1] pointer-events-none"
        style={{ background: "rgba(20,20,20,0.82)" }}
      />

      {/* 登录/注册卡片 */}
      <section className="relative z-[2] w-full max-w-sm rounded-lg border border-white/[0.08] bg-[#12110f]/80 backdrop-blur-sm p-6 shadow-[0_0_60px_rgba(0,0,0,0.6)] mx-4">
        <div className="mb-6">
          <p className="text-sm font-medium uppercase tracking-wide text-white/50">光影画廊</p>
          <h1 className="mt-2 text-2xl font-semibold text-white/90">
            {showRegister ? "注册" : "登录"}
          </h1>
        </div>

        {showRegister ? (
          <form className="space-y-4" onSubmit={handleRegister}>
            <label className="block">
              <span className="text-sm font-medium text-white/70">姓名</span>
              <input
                className="mt-1 w-full rounded-md border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-white placeholder:text-white/30 outline-none transition focus:border-white/30 focus:ring-2 focus:ring-white/10"
                type="text"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                autoComplete="name"
                required
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-white/70">邮箱</span>
              <input
                className="mt-1 w-full rounded-md border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-white placeholder:text-white/30 outline-none transition focus:border-white/30 focus:ring-2 focus:ring-white/10"
                type="email"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-white/70">密码</span>
              <input
                className="mt-1 w-full rounded-md border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-white placeholder:text-white/30 outline-none transition focus:border-white/30 focus:ring-2 focus:ring-white/10"
                type="password"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                autoComplete="new-password"
                minLength={5}
                required
              />
            </label>
            {regError ? (
              <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">{regError}</p>
            ) : null}
            <button
              className="w-full rounded-md bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:bg-white/5 disabled:text-white/30"
              type="submit"
              disabled={isRegistering}
            >
              {isRegistering ? "注册中..." : "注册"}
            </button>
            <p className="text-center text-xs text-white/30">
              已有账号？{" "}
              <button type="button" onClick={() => setShowRegister(false)} className="text-white/50 underline underline-offset-2 transition hover:text-white/70">
                登录
              </button>
            </p>
          </form>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <label className="block">
              <span className="text-sm font-medium text-white/70">邮箱</span>
              <input
                className="mt-1 w-full rounded-md border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-white placeholder:text-white/30 outline-none transition focus:border-white/30 focus:ring-2 focus:ring-white/10"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-white/70">密码</span>
              <input
                className="mt-1 w-full rounded-md border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-white placeholder:text-white/30 outline-none transition focus:border-white/30 focus:ring-2 focus:ring-white/10"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </label>
            {error ? (
              <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>
            ) : null}
            <button
              className="w-full rounded-md bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:bg-white/5 disabled:text-white/30"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? "登录中..." : "登录"}
            </button>
            {registrationAllowed ? (
              <p className="text-center text-xs text-white/30">
                没有账号？{" "}
                <button type="button" onClick={() => setShowRegister(true)} className="text-white/50 underline underline-offset-2 transition hover:text-white/70">
                  注册
                </button>
              </p>
            ) : null}
          </form>
        )}
      </section>
    </main>
  );
}

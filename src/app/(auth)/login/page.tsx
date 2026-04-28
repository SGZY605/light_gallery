"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        const result = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(result?.error ?? "Unable to sign in.");
        return;
      }

      router.push("/dashboard/library");
      router.refresh();
    } catch {
      setError("Unable to sign in. Check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-4 py-12">
      <section className="w-full max-w-sm rounded-lg border border-border bg-card p-6 shadow-[0_0_40px_rgba(0,0,0,0.5)]">
        <div className="mb-6">
          <p className="text-sm font-medium uppercase tracking-wide text-white/50">Light Gallery</p>
          <h1 className="mt-2 text-2xl font-semibold text-white/90">Sign in</h1>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="text-sm font-medium text-white/70">Email</span>
            <input
              className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-white placeholder:text-white/30 outline-none transition focus:border-white/30 focus:ring-2 focus:ring-white/10"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-white/70">Password</span>
            <input
              className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-white placeholder:text-white/30 outline-none transition focus:border-white/30 focus:ring-2 focus:ring-white/10"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </label>

          {error ? (
            <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
              {error}
            </p>
          ) : null}

          <button
            className="w-full rounded-md bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:bg-white/5 disabled:text-white/30"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </section>
    </main>
  );
}

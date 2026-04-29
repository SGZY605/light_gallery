"use client";

import { useTransition } from "react";

type RegistrationToggleProps = {
  allowed: boolean;
  toggleAction: () => void;
};

export function RegistrationToggle({ allowed, toggleAction }: RegistrationToggleProps) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={() => startTransition(toggleAction)}
      disabled={isPending}
      className={[
        "relative inline-flex h-6 w-11 items-center rounded-full transition",
        allowed ? "bg-emerald-500/30" : "bg-white/[0.08]",
        isPending ? "opacity-50" : ""
      ].join(" ")}
    >
      <span
        className={[
          "inline-block h-4 w-4 rounded-full transition-transform",
          allowed ? "translate-x-6 bg-emerald-400" : "translate-x-1 bg-white/40"
        ].join(" ")}
      />
    </button>
  );
}

"use client";

import { useState } from "react";

type CopyShareButtonProps = {
  token: string;
};

export function CopyShareButton({ token }: CopyShareButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const url = `${window.location.origin}/s/${token}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      type="button"
      onClick={() => {
        void handleCopy();
      }}
      className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-white/70 transition hover:border-white/50 hover:text-white"
    >
      {copied ? "已复制" : "复制链接"}
    </button>
  );
}

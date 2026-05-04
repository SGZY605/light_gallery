"use client";

import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";

type CopyShareButtonProps = {
  token: string;
};

export function CopyShareButton({ token }: CopyShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState("");

  useEffect(() => {
    // 动态获取当前域名/IP+端口
    const origin = window.location.origin;
    setShareUrl(`${origin}/s/${token}`);
  }, [token]);

  async function handleCopy() {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/10 px-3 py-2">
        <input
          type="text"
          readOnly
          value={shareUrl}
          className="flex-1 bg-transparent text-xs text-[color:var(--text-secondary)] outline-none"
          onClick={(e) => e.currentTarget.select()}
        />
        <button
          type="button"
          onClick={() => {
            void handleCopy();
          }}
          className="shrink-0 rounded-md p-1.5 text-white/50 transition hover:bg-white/10 hover:text-white"
          aria-label="复制链接"
          title="复制链接"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-green-400" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
      {copied && (
        <div className="flex items-center gap-1.5 text-[10px] text-green-400">
          <Check className="h-3 w-3" />
          复制成功
        </div>
      )}
    </div>
  );
}

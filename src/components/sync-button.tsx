"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";

type SyncProgress = {
  deleted?: number;
  exported?: number;
  imported?: number;
  merged?: number;
  message: string;
  percent: number;
  phase: "file" | "metadata" | "done" | "error";
  restored?: number;
};

type SyncButtonProps = {
  disabled?: boolean;
};

export function SyncButton({ disabled }: SyncButtonProps) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState<SyncProgress | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const handleSync = useCallback(async () => {
    if (syncing) {
      return;
    }

    setSyncing(true);
    setProgress(null);
    abortRef.current = new AbortController();

    try {
      const response = await fetch("/api/sync", {
        method: "POST",
        signal: abortRef.current.signal
      });

      if (!response.ok) {
        setProgress({
          message: `请求失败：${response.status}`,
          percent: 0,
          phase: "error"
        });
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith("data: ")) {
            try {
              const data = JSON.parse(trimmed.slice(6)) as SyncProgress;
              setProgress(data);
            } catch {
              // ignore malformed JSON
            }
          }
        }
      }

      router.refresh();
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
      setProgress({
        message: error instanceof Error ? error.message : "同步失败",
        percent: 0,
        phase: "error"
      });
    } finally {
      setSyncing(false);
      abortRef.current = null;
    }
  }, [syncing, router]);

  const isDone = progress?.phase === "done";
  const isError = progress?.phase === "error";

  return (
    <div className="flex flex-col items-end gap-2">
      {syncing && progress && (
        <div className="w-full max-w-xs">
          <div className="mb-1 flex items-center justify-between text-[10px] text-white/30">
            <span>{progress.message}</span>
            <span>{progress.percent}%</span>
          </div>
          <div className="h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-white/30 transition-all duration-300"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
        </div>
      )}

      {isDone && progress && (
        <div className="w-full max-w-xs text-[10px] text-white/25">
          {progress.message}
        </div>
      )}

      {isError && progress && (
        <div className="w-full max-w-xs text-[10px] text-red-400/60">
          {progress.message}
        </div>
      )}

      <button
        type="button"
        disabled={disabled || syncing}
        onClick={handleSync}
        className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-[color:var(--text-primary)] transition hover:border-white/20 hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-35"
      >
        {syncing ? "同步中..." : "执行本地与 OSS 同步"}
      </button>
    </div>
  );
}

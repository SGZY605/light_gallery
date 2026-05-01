export type SyncProgress = {
  deleted?: number;
  exported?: number;
  imported?: number;
  merged?: number;
  message: string;
  percent: number;
  phase: "file" | "metadata" | "done" | "error";
  restored?: number;
};

function clampPercent(percent: number): number {
  if (!Number.isFinite(percent)) {
    return 0;
  }

  return Math.min(100, Math.max(0, Math.round(percent)));
}

export function mapSyncProgressToOverallPercent(progress: SyncProgress): number {
  const phasePercent = clampPercent(progress.percent);

  if (progress.phase === "done") {
    return 100;
  }

  if (progress.phase === "error") {
    return phasePercent;
  }

  if (progress.phase === "metadata") {
    return Math.min(99, 50 + Math.round(phasePercent * 0.49));
  }

  return Math.min(49, Math.round(phasePercent * 0.5));
}

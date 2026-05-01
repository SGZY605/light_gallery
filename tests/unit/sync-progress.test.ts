import { describe, expect, it } from "vitest";
import { mapSyncProgressToOverallPercent, type SyncProgress } from "@/lib/images/sync-progress";

describe("sync progress mapping", () => {
  it("keeps overall progress monotonic when metadata progress starts at zero", () => {
    const progress: SyncProgress[] = [
      { message: "file scan", percent: 0, phase: "file" },
      { message: "file done", percent: 95, phase: "file" },
      { message: "metadata starts", percent: 0, phase: "metadata" },
      { message: "metadata done", percent: 100, phase: "metadata" },
      { message: "done", percent: 100, phase: "done" }
    ];

    const overallPercents = progress.map(mapSyncProgressToOverallPercent);

    expect(overallPercents).toEqual([0, 48, 50, 99, 100]);
    expect(overallPercents).toEqual([...overallPercents].sort((a, b) => a - b));
  });
});

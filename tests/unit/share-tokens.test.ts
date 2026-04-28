import { describe, expect, it } from "vitest";
import { createShareToken, getShareState, isShareAccessible } from "@/lib/shares/tokens";

describe("share tokens", () => {
  it("creates url-safe random tokens of useful length", () => {
    const token = createShareToken();

    expect(token.length).toBeGreaterThanOrEqual(32);
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("marks revoked shares as inaccessible", () => {
    expect(
      getShareState({
        revoked: true,
        expiresAt: null
      })
    ).toBe("revoked");
    expect(
      isShareAccessible({
        revoked: true,
        expiresAt: null
      })
    ).toBe(false);
  });

  it("marks expired shares as inaccessible", () => {
    expect(
      getShareState(
        {
          revoked: false,
          expiresAt: "2025-01-01T00:00:00.000Z"
        },
        new Date("2025-01-02T00:00:00.000Z")
      )
    ).toBe("expired");
  });
});

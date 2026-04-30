import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUser = vi.fn();
const userUpdateMock = vi.fn();

vi.mock("@/lib/auth/session", () => ({
  getCurrentUser
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      update: userUpdateMock
    }
  }
}));

describe("PUT /api/users/library-preference", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    getCurrentUser.mockResolvedValue({
      id: "user-1",
      role: "ADMIN",
      libraryColumnCount: 4
    });

    userUpdateMock.mockResolvedValue({
      libraryColumnCount: 8
    });
  });

  it("requires an authenticated user", async () => {
    getCurrentUser.mockResolvedValueOnce(null);
    const { PUT } = await import("@/app/api/users/library-preference/route");

    const response = await PUT(
      new Request("http://localhost/api/users/library-preference", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ columnCount: 6 })
      })
    );

    expect(response.status).toBe(401);
    expect(userUpdateMock).not.toHaveBeenCalled();
  });

  it("clamps the saved value and only updates the current user", async () => {
    userUpdateMock.mockResolvedValueOnce({
      libraryColumnCount: 8
    });

    const { PUT } = await import("@/app/api/users/library-preference/route");

    const response = await PUT(
      new Request("http://localhost/api/users/library-preference", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ columnCount: 99 })
      })
    );

    const result = (await response.json()) as {
      libraryColumnCount: number;
    };

    expect(response.status).toBe(200);
    expect(userUpdateMock).toHaveBeenCalledWith({
      where: {
        id: "user-1"
      },
      data: {
        libraryColumnCount: 8
      },
      select: {
        libraryColumnCount: true
      }
    });
    expect(result).toEqual({
      libraryColumnCount: 8
    });
  });

  it("rejects malformed payloads", async () => {
    const { PUT } = await import("@/app/api/users/library-preference/route");

    const response = await PUT(
      new Request("http://localhost/api/users/library-preference", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ columnCount: "wide" })
      })
    );

    expect(response.status).toBe(400);
    expect(userUpdateMock).not.toHaveBeenCalled();
  });
});

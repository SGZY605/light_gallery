import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearImageDetailReturnScrollState,
  IMAGE_DETAIL_RETURN_SCROLL_KEY,
  IMAGE_DETAIL_RETURN_URL_KEY,
  markImageDetailReturnScrollPending,
  readImageDetailPendingReturnScroll,
  restoreImageDetailReturnScroll,
  storeImageDetailReturnState
} from "@/lib/images/detail-return";

function createMemoryStorage(): Storage {
  const values = new Map<string, string>();

  return {
    get length() {
      return values.size;
    },
    clear: vi.fn(() => values.clear()),
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    key: vi.fn((index: number) => Array.from(values.keys())[index] ?? null),
    removeItem: vi.fn((key: string) => values.delete(key)),
    setItem: vi.fn((key: string, value: string) => {
      values.set(key, value);
    })
  };
}

describe("image detail return state", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("stores the clicked image rect with the dashboard scroll container position", () => {
    const storage = createMemoryStorage();
    const dashboardContent = {
      scrollLeft: 8,
      scrollTop: 240,
      scrollTo: vi.fn()
    };

    vi.stubGlobal("sessionStorage", storage);
    vi.stubGlobal("window", {
      location: {
        pathname: "/dashboard/albums",
        search: "?view=timeline"
      },
      scrollX: 12,
      scrollY: 34
    });
    vi.stubGlobal("document", {
      querySelector: vi.fn(() => dashboardContent)
    });

    storeImageDetailReturnState("image-1", {
      x: 10,
      y: 20,
      width: 300,
      height: 200
    });

    expect(storage.getItem("image-rect-image-1")).toBe(
      JSON.stringify({ x: 10, y: 20, width: 300, height: 200 })
    );
    expect(storage.getItem(IMAGE_DETAIL_RETURN_URL_KEY)).toBe("/dashboard/albums?view=timeline");
    expect(JSON.parse(storage.getItem(IMAGE_DETAIL_RETURN_SCROLL_KEY) ?? "{}")).toMatchObject({
      url: "/dashboard/albums?view=timeline",
      dashboardScrollLeft: 8,
      dashboardScrollTop: 240,
      windowScrollX: 12,
      windowScrollY: 34,
      pending: false
    });
  });

  it("restores only matching pending return scroll state", () => {
    const storage = createMemoryStorage();
    const dashboardContent = {
      scrollLeft: 8,
      scrollTop: 240,
      scrollTo: vi.fn()
    };

    vi.stubGlobal("sessionStorage", storage);
    vi.stubGlobal("window", {
      location: {
        pathname: "/dashboard/albums",
        search: ""
      },
      scrollX: 0,
      scrollY: 0,
      scrollTo: vi.fn()
    });
    vi.stubGlobal("document", {
      querySelector: vi.fn(() => dashboardContent)
    });

    storeImageDetailReturnState("image-1", {
      x: 10,
      y: 20,
      width: 300,
      height: 200
    });
    markImageDetailReturnScrollPending("/dashboard/albums");

    expect(readImageDetailPendingReturnScroll("/dashboard/library")).toBeNull();

    const state = readImageDetailPendingReturnScroll("/dashboard/albums");

    expect(state).toMatchObject({
      dashboardScrollLeft: 8,
      dashboardScrollTop: 240,
      pending: true
    });

    restoreImageDetailReturnScroll(state!);

    expect(dashboardContent.scrollTo).toHaveBeenCalledWith({
      left: 8,
      top: 240,
      behavior: "auto"
    });

    clearImageDetailReturnScrollState();

    expect(storage.getItem(IMAGE_DETAIL_RETURN_SCROLL_KEY)).toBeNull();
  });

  it("does not block detail closing when session storage is unavailable", () => {
    vi.stubGlobal("sessionStorage", undefined);

    expect(() => markImageDetailReturnScrollPending("/dashboard/library")).not.toThrow();
    expect(() => readImageDetailPendingReturnScroll("/dashboard/library")).not.toThrow();
    expect(() => clearImageDetailReturnScrollState()).not.toThrow();
  });

  it("does not block detail closing when session storage operations throw", () => {
    vi.stubGlobal("sessionStorage", {
      getItem: vi.fn(() => {
        throw new Error("blocked");
      }),
      removeItem: vi.fn(() => {
        throw new Error("blocked");
      }),
      setItem: vi.fn(() => {
        throw new Error("blocked");
      })
    });

    expect(() => markImageDetailReturnScrollPending("/dashboard/library")).not.toThrow();
    expect(() => readImageDetailPendingReturnScroll("/dashboard/library")).not.toThrow();
    expect(() => clearImageDetailReturnScrollState()).not.toThrow();
  });
});

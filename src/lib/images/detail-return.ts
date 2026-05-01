export const IMAGE_DETAIL_RETURN_URL_KEY = "image-detail-return-url";
export const IMAGE_DETAIL_RETURN_SCROLL_KEY = "image-detail-return-scroll";
export const DASHBOARD_CONTENT_SELECTOR = "[data-dashboard-content]";

type ImageDetailOriginRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ImageDetailReturnScrollState = {
  url: string;
  dashboardScrollLeft: number;
  dashboardScrollTop: number;
  windowScrollX: number;
  windowScrollY: number;
  pending: boolean;
};

function getCurrentReturnUrl(): string {
  return `${window.location.pathname}${window.location.search}`;
}

function getDashboardContentElement(): HTMLElement | null {
  return document.querySelector<HTMLElement>(DASHBOARD_CONTENT_SELECTOR);
}

function getSessionStorage(): Storage | null {
  try {
    return typeof sessionStorage === "undefined" ? null : sessionStorage;
  } catch {
    return null;
  }
}

function getStoredItem(key: string): string | null {
  try {
    return getSessionStorage()?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function setStoredItem(key: string, value: string): void {
  try {
    getSessionStorage()?.setItem(key, value);
  } catch {
    // Storage can be blocked in private or restricted browser contexts.
  }
}

function removeStoredItem(key: string): void {
  try {
    getSessionStorage()?.removeItem(key);
  } catch {
    // Storage can be blocked in private or restricted browser contexts.
  }
}

function toFiniteNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function parseReturnScrollState(raw: string | null): ImageDetailReturnScrollState | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<ImageDetailReturnScrollState>;

    if (typeof parsed.url !== "string") {
      return null;
    }

    return {
      url: parsed.url,
      dashboardScrollLeft: toFiniteNumber(parsed.dashboardScrollLeft, 0),
      dashboardScrollTop: toFiniteNumber(parsed.dashboardScrollTop, 0),
      windowScrollX: toFiniteNumber(parsed.windowScrollX, 0),
      windowScrollY: toFiniteNumber(parsed.windowScrollY, 0),
      pending: parsed.pending === true
    };
  } catch {
    return null;
  }
}

export function storeImageDetailReturnState(imageId: string, rect: ImageDetailOriginRect): void {
  const returnUrl = getCurrentReturnUrl();
  const dashboardContent = getDashboardContentElement();

  setStoredItem(
    `image-rect-${imageId}`,
    JSON.stringify({
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height
    })
  );
  setStoredItem(IMAGE_DETAIL_RETURN_URL_KEY, returnUrl);
  setStoredItem(
    IMAGE_DETAIL_RETURN_SCROLL_KEY,
    JSON.stringify({
      url: returnUrl,
      dashboardScrollLeft: dashboardContent?.scrollLeft ?? window.scrollX,
      dashboardScrollTop: dashboardContent?.scrollTop ?? window.scrollY,
      windowScrollX: window.scrollX,
      windowScrollY: window.scrollY,
      pending: false
    } satisfies ImageDetailReturnScrollState)
  );
}

export function markImageDetailReturnScrollPending(returnUrl: string): void {
  const storedState = parseReturnScrollState(getStoredItem(IMAGE_DETAIL_RETURN_SCROLL_KEY));

  if (!storedState || storedState.url !== returnUrl) {
    return;
  }

  setStoredItem(
    IMAGE_DETAIL_RETURN_SCROLL_KEY,
    JSON.stringify({
      ...storedState,
      pending: true
    } satisfies ImageDetailReturnScrollState)
  );
}

export function readImageDetailPendingReturnScroll(currentUrl: string): ImageDetailReturnScrollState | null {
  const storedState = parseReturnScrollState(getStoredItem(IMAGE_DETAIL_RETURN_SCROLL_KEY));

  if (!storedState || !storedState.pending || storedState.url !== currentUrl) {
    return null;
  }

  return storedState;
}

export function clearImageDetailReturnScrollState(): void {
  removeStoredItem(IMAGE_DETAIL_RETURN_SCROLL_KEY);
}

export function restoreImageDetailReturnScroll(state: ImageDetailReturnScrollState): void {
  const dashboardContent = getDashboardContentElement();

  if (dashboardContent) {
    dashboardContent.scrollTo({
      left: state.dashboardScrollLeft,
      top: state.dashboardScrollTop,
      behavior: "auto"
    });
    return;
  }

  window.scrollTo({
    left: state.windowScrollX,
    top: state.windowScrollY,
    behavior: "auto"
  });
}

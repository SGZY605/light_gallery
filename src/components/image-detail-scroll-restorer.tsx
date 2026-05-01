"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  clearImageDetailReturnScrollState,
  readImageDetailPendingReturnScroll,
  restoreImageDetailReturnScroll
} from "@/lib/images/detail-return";

function buildCurrentUrl(pathname: string, searchParamsText: string): string {
  return searchParamsText ? `${pathname}?${searchParamsText}` : pathname;
}

export function ImageDetailScrollRestorer() {
  const pathname = usePathname();

  useEffect(() => {
    try {
      const searchParamsText = window.location.search.replace(/^\?/, "");
      const restoreState = readImageDetailPendingReturnScroll(buildCurrentUrl(pathname, searchParamsText));

      if (!restoreState) {
        return;
      }

      clearImageDetailReturnScrollState();
      requestAnimationFrame(() => {
        requestAnimationFrame(() => restoreImageDetailReturnScroll(restoreState));
      });
    } catch {
      clearImageDetailReturnScrollState();
    }
  }, [pathname]);

  return null;
}

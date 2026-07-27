"use client";

import { useEffect, useState } from "react";

/** lg(1024px) 미만 — 모바일 셸과 동일한 뷰포트 기준 */
const MOBILE_QUERY = "(max-width: 1023px)";

export function useMobileViewport() {
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const query = window.matchMedia(MOBILE_QUERY);
    const update = () => setMobile(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return mobile;
}

/** Imperative check for event handlers (SSR-safe). */
export function isMobileViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia(MOBILE_QUERY).matches;
}

"use client";

import { useEffect } from "react";

/** 첫 방문 1회만 서버 부트스트랩 (레이아웃 블로킹 제거) */
export function PlatformBootstrapClient() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem("mocomo_platform_boot")) return;

    const run = () => {
      fetch("/api/platform/bootstrap", { method: "POST", keepalive: true })
        .then(() => sessionStorage.setItem("mocomo_platform_boot", "1"))
        .catch(() => undefined);
    };

    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(run, { timeout: 4000 });
    } else {
      setTimeout(run, 2000);
    }
  }, []);

  return null;
}

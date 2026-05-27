"use client";

import { useEffect } from "react";

/**
 * 개발 환경에서만 공개 bootstrap 호출.
 * 프로덕션은 Vercel 빌드 시 seed 로 처리 — 무인증 POST 공격면 제거.
 */
export function PlatformBootstrapClient() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
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

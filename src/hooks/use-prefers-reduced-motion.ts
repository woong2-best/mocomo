"use client";

import { useEffect, useState } from "react";

function readReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  if (document.documentElement.dataset.visibleAnimations === "off") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function usePrefersReducedMotion(): boolean {
  // SSR·하이드레이션 첫 프레임은 false로 고정 — document.dataset는 클라이언트에서만 읽음
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(readReducedMotion());
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return reduced;
}

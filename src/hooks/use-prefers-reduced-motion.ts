"use client";

import { useEffect, useState } from "react";

function readReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  if (document.documentElement.dataset.visibleAnimations === "off") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(readReducedMotion);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(readReducedMotion());
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return reduced;
}

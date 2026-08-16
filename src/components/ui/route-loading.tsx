/** Soft route / Suspense fallback — top progress bar only. */
"use client";

import { useEffect } from "react";
import { topProgress } from "@/lib/top-progress";

export function RouteLoading(_props?: {
  narrow?: boolean;
  chrome?: boolean;
  maxWidth?: "lg" | "2xl" | "3xl" | "4xl" | "5xl" | "6xl";
  variant?: "default" | "grid";
  className?: string;
}) {
  useEffect(() => {
    topProgress.start();
    return () => {
      topProgress.done();
    };
  }, []);

  return null;
}

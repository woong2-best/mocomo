"use client";

import { useEffect } from "react";
import {
  detectStaleBuildBundle,
  isStaleDeploymentError,
  reloadForStaleDeployment,
} from "@/lib/stale-deployment-error";

/** 배포 직후 chunk / server action / React hook 불일치 시 자동 새로고침 */
export function StaleDeploymentRecovery() {
  useEffect(() => {
    function onError(event: ErrorEvent) {
      if (!isStaleDeploymentError(event.error ?? event.message)) return;
      reloadForStaleDeployment();
    }

    function onRejection(event: PromiseRejectionEvent) {
      if (!isStaleDeploymentError(event.reason)) return;
      reloadForStaleDeployment();
    }

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);

    void detectStaleBuildBundle().then((stale) => {
      if (stale) reloadForStaleDeployment();
    });

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}

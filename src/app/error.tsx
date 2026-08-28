"use client";

import { useEffect, useState } from "react";
import { DEFAULT_LANDING_PATH } from "@/lib/site-routes";
import { AppErrorState } from "@/components/ui/app-error-state";
import { isStaleDeploymentError, reloadForStaleDeployment } from "@/lib/stale-deployment-error";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [recovering, setRecovering] = useState(false);
  const staleDeploy = isStaleDeploymentError(error);

  useEffect(() => {
    console.error("[app-error]", error);
    if (!staleDeploy) return;
    setRecovering(true);
    reloadForStaleDeployment();
  }, [error, staleDeploy]);

  if (recovering) {
    return (
      <AppErrorState
        title="업데이트 반영 중"
        description="새 버전을 불러오는 중입니다. 잠시만 기다려 주세요."
      />
    );
  }

  return (
    <AppErrorState
      title="문제가 발생했습니다"
      description={
        staleDeploy
          ? "배포 직후 일시적으로 발생할 수 있습니다. 새로고침(Ctrl+Shift+R) 후 다시 시도해 주세요."
          : "일시적인 오류일 수 있습니다. 다시 시도하거나 홈으로 이동해 주세요."
      }
      onRetry={() => {
        if (staleDeploy) reloadForStaleDeployment();
        else reset();
      }}
      retryLabel={staleDeploy ? "새로고침" : "다시 시도"}
      primaryHref={DEFAULT_LANDING_PATH}
      primaryLabel="홈으로"
    />
  );
}

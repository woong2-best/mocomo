"use client";

import { useEffect } from "react";
import { DEFAULT_LANDING_PATH } from "@/lib/site-routes";
import { AppErrorState } from "@/components/ui/app-error-state";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app-error]", error);
  }, [error]);

  return (
    <AppErrorState
      title="문제가 발생했습니다"
      description="일시적인 오류일 수 있습니다. 다시 시도하거나 홈으로 이동해 주세요."
      onRetry={() => reset()}
      primaryHref={DEFAULT_LANDING_PATH}
      primaryLabel="홈으로"
    />
  );
}

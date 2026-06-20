"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DEFAULT_LANDING_PATH } from "@/lib/site-routes";

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
    <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 text-center gap-4">
      <h1 className="text-xl font-bold">문제가 발생했습니다</h1>
      <p className="text-sm text-muted-foreground max-w-md">
        일시적인 오류일 수 있습니다. 다시 시도하거나 홈으로 이동해 주세요.
      </p>
      <div className="flex gap-2">
        <Button type="button" variant="secondary" onClick={() => reset()}>
          다시 시도
        </Button>
        <Button asChild>
          <Link href={DEFAULT_LANDING_PATH}>홈으로</Link>
        </Button>
      </div>
    </div>
  );
}

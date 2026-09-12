"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function WalletError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[wallet]", error);
  }, [error]);

  return (
    <div className="max-w-lg mx-auto py-16 px-4 text-center space-y-4">
      <h1 className="text-xl font-black">지갑을 불러오지 못했습니다</h1>
      <p className="text-sm text-muted-foreground leading-relaxed">
        일시적인 오류일 수 있습니다. 새로고침하거나 잠시 후 다시 시도해 주세요.
      </p>
      <div className="flex flex-wrap justify-center gap-2 pt-2">
        <Button type="button" onClick={() => reset()}>
          다시 시도
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href="/">홈으로</Link>
        </Button>
      </div>
    </div>
  );
}

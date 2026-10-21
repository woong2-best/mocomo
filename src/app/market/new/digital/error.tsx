"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function MarketDigitalSellError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    console.error("[market/new/digital]", error.stack ?? error.message);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <p className="text-base font-semibold text-foreground">페이지를 불러오는 중 오류가 발생했습니다</p>
      <Link
        href="/"
        className="inline-flex h-11 items-center justify-center rounded-full bg-folk-terracotta px-5 text-sm font-extrabold text-white"
      >
        메인으로 이동
      </Link>
    </div>
  );
}

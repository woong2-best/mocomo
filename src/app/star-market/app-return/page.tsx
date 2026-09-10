"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { mobileDeepLinkFromPath } from "@/lib/mobile-deeplink";

const TARGET_PATHS: Record<string, string> = {
  MarketSellItem: "/MarketSellItem",
  SellerListings: "/SellerListings",
  Market: "/market",
};

function MarketAppReturnInner() {
  const params = useSearchParams();
  const target = params.get("target") ?? "MarketSellItem";

  useEffect(() => {
    const webPath = TARGET_PATHS[target] ?? "/MarketSellItem";
    const deeplink = mobileDeepLinkFromPath(webPath);
    window.location.replace(deeplink);
  }, [target]);

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-[#f5f6f8] p-6 text-center">
      <div className="space-y-2">
        <p className="text-sm font-semibold text-[#1a1a1a]">앱으로 돌아가는 중…</p>
        <p className="text-xs text-muted-foreground">잠시만 기다려 주세요.</p>
      </div>
    </main>
  );
}

/** MoCoMo 앱 판매자 온보딩 완료 → 네이티브 앱 복귀 */
export default function MarketAppReturnPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-[100dvh] items-center justify-center p-6 text-center">
          <p className="text-sm text-muted-foreground">앱으로 돌아가는 중…</p>
        </main>
      }
    >
      <MarketAppReturnInner />
    </Suspense>
  );
}

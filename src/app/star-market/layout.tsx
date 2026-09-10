"use client";

import { usePathname } from "next/navigation";
import { MarketNav } from "@/components/market/market-nav";
import { MarketPageChrome } from "@/components/market/market-page-chrome";

export default function MarketLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  /** 판매자센터·가입·앱복귀는 전용 크롬 (MARKET 탭 숨김) */
  const isSellerPortal =
    pathname.startsWith("/market/seller") || pathname.startsWith("/market/app-return");

  if (isSellerPortal) {
    return <>{children}</>;
  }

  return (
    <MarketPageChrome>
      <MarketNav />
      {children}
    </MarketPageChrome>
  );
}

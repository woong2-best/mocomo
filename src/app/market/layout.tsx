"use client";

import { usePathname } from "next/navigation";
import { MarketNav } from "@/components/market/market-nav";
import { MarketPageChrome } from "@/components/market/market-page-chrome";

export default function MarketLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  /** 판매자센터·가입은 전용 WING 스타일 크롬 사용 (MARKET 탭 숨김) */
  const isSellerPortal = pathname.startsWith("/market/seller");

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

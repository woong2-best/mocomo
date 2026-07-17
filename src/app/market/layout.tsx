"use client";

import { usePathname } from "next/navigation";
import { MarketNav } from "@/components/market/market-nav";
import { MarketPageChrome } from "@/components/market/market-page-chrome";

export default function MarketLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isSellerPortal =
    pathname.startsWith("/market/seller/register") ||
    pathname.startsWith("/market/seller/onboarding");

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

import { Suspense } from "react";
import { MarketHomeAsync } from "@/components/market/market-home-async";
import { MarketPageChrome } from "@/components/market/market-page-chrome";
import { MarketGridSkeleton } from "@/components/ui/content-skeletons";

export const revalidate = 120;

export default function MarketHomePage() {
  return (
    <MarketPageChrome>
      <Suspense fallback={<MarketGridSkeleton />}>
        <MarketHomeAsync />
      </Suspense>
    </MarketPageChrome>
  );
}

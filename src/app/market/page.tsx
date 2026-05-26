import { Suspense } from "react";
import { MarketHomeAsync } from "@/components/market/market-home-async";
import { MarketGridSkeleton } from "@/components/ui/content-skeletons";

export const revalidate = 120;

export default function MarketHomePage() {
  return (
    <Suspense fallback={<MarketGridSkeleton />}>
      <MarketHomeAsync />
    </Suspense>
  );
}

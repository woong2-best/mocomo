import { Suspense } from "react";
import { MarketplaceHomeAsync } from "@/components/market/marketplace-home-async";
import { MarketGridSkeleton } from "@/components/ui/content-skeletons";

export const dynamic = "force-dynamic";

export default async function MarketHomePage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; q?: string }>;
}) {
  const { type, q } = await searchParams;

  return (
    <Suspense fallback={<MarketGridSkeleton />}>
      <MarketplaceHomeAsync type={type} q={q} />
    </Suspense>
  );
}

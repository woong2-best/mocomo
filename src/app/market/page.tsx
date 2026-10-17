import { Suspense } from "react";
import { UsedMarketChips } from "@/components/used/used-market-chips";
import { UsedMarketFeed } from "@/components/used/used-market-feed";
import { UsedFeedSkeleton } from "@/components/used/used-loading-skeletons";

export const dynamic = "force-dynamic";

export default async function UsedHomePage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    track?: string;
    lane?: string;
    category?: string;
    product?: string;
    region?: string;
    sido?: string;
  }>;
}) {
  const search = await searchParams;
  return (
    <div className="space-y-2">
      <UsedMarketChips
        track={search.track}
        lane={search.lane}
        category={search.category}
        product={search.product}
      />
      <Suspense fallback={<UsedFeedSkeleton />}>
        <UsedMarketFeed
          q={search.q}
          track={search.track}
          lane={search.lane}
          category={search.category}
          product={search.product}
          region={search.region}
          sido={search.sido}
        />
      </Suspense>
    </div>
  );
}

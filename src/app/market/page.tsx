import { Suspense } from "react";
import { UsedMarketChips } from "@/components/used/used-market-chips";
import { UsedMarketFeed } from "@/components/used/used-market-feed";
import { UsedFeedSkeleton } from "@/components/used/used-loading-skeletons";
import { USED_SHIPPING_REGION } from "@/lib/korea-regions";

export const dynamic = "force-dynamic";

type MarketSearch = {
  q?: string;
  category?: string;
  region?: string;
  sido?: string;
  work?: string;
  product?: string;
  condition?: string;
  limited?: string;
  trade?: string;
  anime?: string;
  track?: string;
  lane?: string;
};

export default async function UsedHomePage({
  searchParams,
}: {
  searchParams: Promise<MarketSearch>;
}) {
  const search = await searchParams;
  const shipping = search.sido === "__shipping__";
  const region = shipping ? USED_SHIPPING_REGION : search.region;
  const sido = shipping ? undefined : search.sido;

  return (
    <div className="space-y-2">
      <UsedMarketChips
        track={search.track}
        lane={search.lane}
        category={search.category}
        product={search.product}
        q={search.q}
        region={search.region}
        sido={search.sido}
        condition={search.condition}
        limited={search.limited}
        trade={search.trade}
      />
      <Suspense fallback={<UsedFeedSkeleton />}>
        <UsedMarketFeed
          q={search.q}
          track={search.track}
          lane={search.lane}
          category={search.category}
          product={search.product}
          region={region}
          sido={sido}
          condition={search.condition}
          limited={search.limited}
          trade={search.trade}
          work={search.work}
          anime={search.anime}
        />
      </Suspense>
    </div>
  );
}

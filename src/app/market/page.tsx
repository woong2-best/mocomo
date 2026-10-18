import { UsedMarketChips } from "@/components/used/used-market-chips";
import { UsedMarketFeedClient } from "@/components/used/used-market-feed-client";
import { USED_SHIPPING_REGION } from "@/lib/korea-regions";

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
    condition?: string;
    limited?: string;
    trade?: string;
  }>;
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
      <UsedMarketFeedClient
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
      />
    </div>
  );
}

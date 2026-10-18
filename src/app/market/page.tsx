import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { resolveUsedMarketScope } from "@/lib/used-market-locale-scope";
import { UsedSearchHeader } from "@/components/used/used-search-header";
import { UsedMarketFeed } from "@/components/used/used-market-feed";
import { UsedFeedSkeleton } from "@/components/used/used-loading-skeletons";

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
  const session = await auth();
  const scope = await resolveUsedMarketScope({
    userId: session?.user?.id,
    sessionCountry: session?.user?.countryCode,
  });

  return (
    <div className="space-y-2">
      <Suspense fallback={null}>
        <UsedSearchHeader
          viewerCountryCode={scope.countryCode}
          viewerServiceRegion={scope.serviceRegion}
          track={search.track}
          lane={search.lane}
          category={search.category}
          product={search.product}
          activeQ={search.q}
          region={search.region}
          sido={search.sido}
          condition={search.condition}
          limited={search.limited}
          trade={search.trade}
          work={search.work}
          anime={search.anime}
        />
      </Suspense>
      <Suspense fallback={<UsedFeedSkeleton />}>
        <UsedMarketFeed
          q={search.q}
          track={search.track}
          lane={search.lane}
          category={search.category}
          product={search.product}
          region={search.region}
          sido={search.sido}
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

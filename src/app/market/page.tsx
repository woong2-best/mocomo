import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Package } from "lucide-react";
import { getUsedListings, getViewerUsedListingStarIds, isUsedDbReady } from "@/actions/used-market";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { resolveUsedMarketScope } from "@/lib/used-market-locale-scope";
import {
  listingMatchesBrowseCategory,
  matchUsedBrowseCategory,
  usedQueryFacets,
} from "@/lib/used-market-query";
import { DbSetupBanner } from "@/components/ui/db-setup-banner";
import { UsedListingGrid } from "@/components/used/used-listing-grid";
import { UsedQueryCategories } from "@/components/used/used-query-categories";
import { UsedSearchHeader } from "@/components/used/used-search-header";
import { UsedFeedSkeleton } from "@/components/used/used-loading-skeletons";
import { Button } from "@/components/ui/button";

type MarketSearch = {
  q?: string;
  category?: string;
  region?: string;
  country?: string;
  sido?: string;
  mode?: string;
  work?: string;
  product?: string;
  condition?: string;
  limited?: string;
  trade?: string;
  anime?: string;
};

function categoryRedirectHref(search: MarketSearch): string | null {
  const q = search.q?.trim();
  if (!q) return null;
  const categoryId = matchUsedBrowseCategory(q);
  if (!categoryId) return null;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(search)) {
    if (key === "q" || key === "category" || typeof value !== "string" || !value) continue;
    params.set(key, value);
  }
  params.set("category", categoryId);
  return `/market?${params.toString()}`;
}

async function UsedFeed({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    category?: string;
    region?: string;
    country?: string;
    sido?: string;
    mode?: string;
    work?: string;
    product?: string;
    condition?: string;
    limited?: string;
    trade?: string;
    anime?: string;
  }>;
}) {
  const { q, category, region, sido, mode, work, product, condition, limited, trade, anime } =
    await searchParams;
  const query = q?.trim() || "";

  const session = await auth();
  const listParams = {
    q: query || undefined,
    region,
    sido,
    work,
    product,
    condition,
    limited,
    trade,
    anime,
    status: "SELLING" as const,
    liveAuctionOnly: false,
    take: query ? 80 : 48,
  };
  const viewer = {
    viewerId: session?.user?.id ?? null,
    sessionCountry: session?.user?.countryCode ?? null,
  };
  const [dbReady, pool] = await Promise.all([
    isUsedDbReady(),
    getUsedListings(query ? listParams : { ...listParams, category }, viewer),
  ]);
  const facets = query ? usedQueryFacets(pool) : [];
  const listings =
    query && category ? pool.filter((listing) => listingMatchesBrowseCategory(listing, category)) : pool;

  const viewerPrefs = session?.user?.id
    ? await db.user.findUnique({
        where: { id: session.user.id },
        select: { showNsfw: true },
      })
    : null;
  const viewerShowNsfw = viewerPrefs?.showNsfw ?? false;

  if (!dbReady) {
    return <DbSetupBanner title={t("app.market.sodwy3p")} />;
  }

  const preserved: Record<string, string> = {};
  for (const [key, value] of Object.entries({
    q: query,
    region,
    sido,
    mode,
    work,
    product,
    condition,
    limited,
    trade,
    anime,
  })) {
    if (value) preserved[key] = value;
  }

  const empty = (
    <div className="py-16 text-center space-y-4">
      <Package className="h-12 w-12 mx-auto text-muted-foreground/40" />
      <p className="text-muted-foreground text-sm">
        {query || category || region || sido || work || product
          ? t("app.market.sxn1r68")
          : t("app.market.s10s1572")}
      </p>
      <Button variant="secondary" asChild>
        <Link href="/market/new">{t("cosplay.s16wni3f")}</Link>
      </Button>
    </div>
  );

  const starredIds =
    listings.length > 0 && session?.user?.id
      ? await getViewerUsedListingStarIds(
          session.user.id,
          listings.map((listing) => listing.id)
        )
      : [];
  const starredSet = new Set(starredIds);

  const grid =
    listings.length === 0 ? (
      empty
    ) : (
      <UsedListingGrid
        listings={listings.map((listing) => ({ ...listing, starred: starredSet.has(listing.id) }))}
        viewerUserId={session?.user?.id ?? null}
        viewerShowNsfw={viewerShowNsfw}
      />
    );

  if (!query || facets.length === 0) return grid;

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
      <UsedQueryCategories facets={facets} activeCategory={category} preserved={preserved} />
      <div className="min-w-0 flex-1">{grid}</div>
    </div>
  );
}

export default async function UsedHomePage({
  searchParams,
}: {
  searchParams: Promise<MarketSearch>;
}) {
  const search = await searchParams;
  const categoryHref = categoryRedirectHref(search);
  if (categoryHref) redirect(categoryHref);

  const session = await auth();
  const scope = await resolveUsedMarketScope({
    userId: session?.user?.id,
    sessionCountry: session?.user?.countryCode,
  });

  return (
    <div className="space-y-2">
      <UsedSearchHeader
        viewerCountryCode={scope.countryCode}
        viewerServiceRegion={scope.serviceRegion}
      />
      <Suspense fallback={<UsedFeedSkeleton />}>
        <UsedFeed searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

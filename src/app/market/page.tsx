import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Package } from "lucide-react";
import {
  getMyUsedHubLane,
  getUsedListings,
  getViewerUsedListingStarIds,
  isUsedDbReady,
} from "@/actions/used-market";
import { listCreatorStudios } from "@/lib/creator-studio";
import { parseMarketLane, parseMarketTrack } from "@/lib/market-browse";
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
  track?: string;
  lane?: string;
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
    track?: string;
    lane?: string;
  }>;
}) {
  const {
    q,
    category,
    region,
    sido,
    mode,
    work,
    product,
    condition,
    limited,
    trade,
    anime,
    track: trackParam,
    lane: laneParam,
  } = await searchParams;
  const query = q?.trim() || "";
  const lane = parseMarketLane(laneParam);
  const track = lane ? undefined : parseMarketTrack(trackParam);

  try {
    return await renderUsedFeed({
      q: query,
      category,
      region,
      sido,
      mode,
      work,
      product,
      condition,
      limited,
      trade,
      anime,
      track,
      lane,
    });
  } catch (error) {
    return (
      <p className="p-6 text-sm text-destructive">
        {error instanceof Error ? error.message : "Market failed to load."}
      </p>
    );
  }
}

async function renderUsedFeed(input: {
  q: string;
  category?: string;
  region?: string;
  sido?: string;
  mode?: string;
  work?: string;
  product?: string;
  condition?: string;
  limited?: string;
  trade?: string;
  anime?: string;
  track?: "physical" | "digital";
  lane?: ReturnType<typeof parseMarketLane>;
}) {
  const {
    q: query,
    category,
    region,
    sido,
    mode,
    work,
    product,
    condition,
    limited,
    trade,
    anime,
    track,
    lane,
  } = input;
  const session = await auth();

  if (lane && !session?.user?.id) {
    return (
      <div className="py-16 text-center space-y-3">
        <p className="text-sm text-muted-foreground">{t("market.sign_in_to_view_trades")}</p>
        <Button variant="secondary" asChild>
          <Link href={`/auth/signin?callbackUrl=${encodeURIComponent(`/market?lane=${lane}`)}`}>
            {t("auth.signInRequired")}
          </Link>
        </Button>
      </div>
    );
  }

  if (lane && session?.user?.id) {
    const dbReady = await isUsedDbReady();
    if (!dbReady) {
      return <DbSetupBanner title={t("app.market.sodwy3p")} />;
    }
    const hub = await getMyUsedHubLane(lane);
    const listings = hub.items.map((item) => ({
      id: item.id,
      title: item.title,
      price: item.price,
      currency: item.currency,
      region: item.region ?? "",
      status: item.status,
      images: item.thumbnailUrl ? [item.thumbnailUrl] : [],
      createdAt: new Date(item.createdAt),
      saleType: item.saleType,
      auctionEndsAt: item.auctionEndsAt,
      currentBidAmount: item.currentBidAmount,
      bidCount: item.bidCount ?? undefined,
      sellerId: item.sellerId,
      favorited: "favorited" in item ? item.favorited : false,
      isNsfw: "isNsfw" in item ? item.isNsfw : false,
    }));
    if (listings.length === 0) {
      const emptyKey =
        lane === "purchased"
          ? "ui.no_purchases_yet"
          : lane === "sales"
            ? "ui.no_completed_sales"
            : lane === "my"
              ? "ui.no_listings_yet"
              : "ui.no_favorites_yet";
      return <p className="py-16 text-center text-sm text-muted-foreground">{t(emptyKey)}</p>;
    }
    return (
      <UsedListingGrid
        listings={listings}
        viewerUserId={session.user.id}
        viewerShowNsfw={false}
      />
    );
  }

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
    track,
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
    getUsedListings(
      {
        ...listParams,
        category: track === "digital" ? undefined : category,
        product: track === "physical" ? undefined : product,
        track,
      },
      viewer
    ),
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
  const studios = track === "physical" ? [] : await listCreatorStudios(query || undefined).catch(() => []);
  const studioStrip =
    studios.length > 0 ? (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {studios.map((studio) => {
          const cover = studio.portfolio.find((item) => item.kind !== "video");
          return (
            <Link key={studio.id} href={`/market/studio/${studio.id}`} className="overflow-hidden rounded-xl border bg-card">
              {cover ? <img src={cover.url} alt="" className="aspect-square w-full object-cover" /> : <div className="aspect-square bg-muted" />}
              <div className="space-y-1 p-2">
                <p className="line-clamp-2 text-sm font-extrabold">{studio.title}</p>
                <p className="text-xs text-muted-foreground">@{studio.seller.username}</p>
                <p className="text-sm font-extrabold text-folk-terracotta">
                  {t("market.studio.from")} {studio.fromPrice.toLocaleString()}
                </p>
                <p className={`text-xs font-bold ${studio.accepting ? "text-emerald-500" : "text-muted-foreground"}`}>
                  {studio.accepting ? t("market.studio.open") : t("market.studio.closed")} {studio.slotsUsed}/{studio.slotCap}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    ) : null;

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

  const body = (
    <div className="space-y-4">
      {studioStrip}
      {grid}
    </div>
  );

  if (!query || facets.length === 0) return body;

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
      <UsedQueryCategories facets={facets} activeCategory={category} preserved={preserved} />
      <div className="min-w-0 flex-1">{body}</div>
    </div>
  );
}

export default async function UsedHomePage({
  searchParams,
}: {
  searchParams: Promise<MarketSearch>;
}) {
  try {
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
        <Suspense fallback={null}>
          <UsedSearchHeader
            viewerCountryCode={scope.countryCode}
            viewerServiceRegion={scope.serviceRegion}
            track={parseMarketTrack(search.track)}
            lane={parseMarketLane(search.lane) ?? null}
            category={search.category ?? null}
            product={search.product ?? null}
            activeQ={search.q ?? null}
          />
        </Suspense>
        <Suspense fallback={<UsedFeedSkeleton />}>
          <UsedFeed searchParams={searchParams} />
        </Suspense>
      </div>
    );
  } catch (error) {
    return (
      <p className="p-6 text-sm text-destructive">
        {error instanceof Error ? error.message : "Market failed to load."}
      </p>
    );
  }
}

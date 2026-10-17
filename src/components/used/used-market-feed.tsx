import Link from "next/link";
import { Package } from "lucide-react";
import { getUsedListings, getViewerUsedListingStarIds, isUsedDbReady } from "@/actions/used-market";
import { listCreatorStudios } from "@/lib/creator-studio";
import { parseMarketLane, parseMarketTrack } from "@/lib/market-browse";
import { auth } from "@/lib/auth";
import { listingImages } from "@/lib/used-market";
import { UsedListingGrid } from "@/components/used/used-listing-grid";
import { DbSetupBanner } from "@/components/ui/db-setup-banner";
import { Button } from "@/components/ui/button";
import { createTranslator } from "@/lib/i18n/messages";

const t = createTranslator("en");

export async function UsedMarketFeed({
  q,
  category,
  product,
  track: trackParam,
  lane: laneParam,
  region,
  sido,
}: {
  q?: string;
  category?: string;
  product?: string;
  track?: string;
  lane?: string;
  region?: string;
  sido?: string;
}) {
  try {
  const query = q?.trim() || "";
  const lane = parseMarketLane(laneParam);
  const track = lane ? undefined : parseMarketTrack(trackParam);
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
    const { getMyUsedHubLane } = await import("@/actions/used-market");
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
    return <UsedListingGrid listings={listings} viewerUserId={session.user.id} />;
  }

  const dbReady = await isUsedDbReady();
  if (!dbReady) return <DbSetupBanner title={t("app.market.sodwy3p")} />;

  const rows = await getUsedListings(
    {
      q: query || undefined,
      region,
      sido,
      category: track === "digital" ? undefined : category,
      product: track === "physical" ? undefined : product,
      track,
      status: "SELLING",
      take: query ? 80 : 48,
    },
    { viewerId: session?.user?.id ?? null, sessionCountry: session?.user?.countryCode ?? null }
  );

  const starredIds =
    rows.length > 0 && session?.user?.id
      ? await getViewerUsedListingStarIds(
          session.user.id,
          rows.map((listing) => listing.id)
        )
      : [];
  const starredSet = new Set(starredIds);

  const listings = rows.map((listing) => ({
    id: listing.id,
    title: listing.title,
    price: listing.price,
    currency: listing.currency,
    region: listing.region,
    status: listing.status,
    images: listingImages(listing.images),
    createdAt: listing.createdAt,
    saleType: listing.saleType,
    auctionEndsAt: listing.auctionEndsAt,
    currentBidAmount: listing.currentBidAmount,
    bidCount: listing.bidCount ?? undefined,
    sellerId: listing.sellerId,
    isNsfw: listing.isNsfw,
    favorited: starredSet.has(listing.id),
    starred: starredSet.has(listing.id),
  }));

  const studios =
    track === "digital" ? await listCreatorStudios(query || undefined).catch(() => []) : [];

  if (listings.length === 0 && studios.length === 0) {
    return (
      <div className="py-16 text-center space-y-4">
        <Package className="h-12 w-12 mx-auto text-muted-foreground/40" />
        <p className="text-muted-foreground text-sm">
          {query || category || product ? t("app.market.sxn1r68") : t("app.market.s10s1572")}
        </p>
        <Button variant="secondary" asChild>
          <Link href="/market/new">{t("cosplay.s16wni3f")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {studios.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {studios.map((studio) => {
            const cover = studio.portfolio.find((item) => item.kind !== "video");
            return (
              <Link key={studio.id} href={`/market/studio/${studio.id}`} className="overflow-hidden rounded-xl border bg-card">
                {cover ? (
                  <img src={cover.url} alt="" className="aspect-square w-full object-cover" />
                ) : (
                  <div className="aspect-square bg-muted" />
                )}
                <div className="space-y-1 p-2">
                  <p className="line-clamp-2 text-sm font-extrabold">{studio.title}</p>
                  <p className="text-xs text-muted-foreground">@{studio.seller.username}</p>
                </div>
              </Link>
            );
          })}
        </div>
      ) : null}
      {listings.length > 0 ? (
        <UsedListingGrid listings={listings} viewerUserId={session?.user?.id ?? null} />
      ) : null}
    </div>
  );
  } catch (error) {
    return (
      <p className="p-6 text-sm text-destructive">
        {error instanceof Error ? error.message : "Could not load listings."}
      </p>
    );
  }
}

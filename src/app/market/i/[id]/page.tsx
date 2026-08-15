import Link from "next/link";
import { notFound } from "next/navigation";
import { getMarketplaceListing } from "@/actions/marketplace";
import { listingTypeLabel, computeMarketplaceFees } from "@/lib/marketplace/constants";
import { shipCountryLabel } from "@/lib/marketplace/shipping-config";
import { MarketplaceBuyPanel } from "@/components/market/marketplace-buy-panel";
import { MarketplaceReportButton } from "@/components/market/marketplace-report-button";
import { Button } from "@/components/ui/button";
import { isPaymentsConfigured } from "@/lib/payments";
import { MarketplaceListingMedia } from "@/components/market/marketplace-listing-media";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function MarketplaceListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [listing, session] = await Promise.all([getMarketplaceListing(id), auth()]);
  if (!listing) notFound();

  const fees = computeMarketplaceFees(listing.priceAmount, listing.shippingFeeFixed);
  const options = Array.isArray(listing.options)
    ? (listing.options as { name?: string; values?: string[] }[])
    : [];
  const isOwner = session?.user?.id === listing.sellerId;
  const viewerPrefs = session?.user?.id
    ? await db.user.findUnique({
        where: { id: session.user.id },
        select: { showNsfw: true },
      })
    : null;
  const viewerShowNsfw = viewerPrefs?.showNsfw ?? false;
  const mediaUrls = listing.media.map((m) => m.url).filter(Boolean);

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-2">
        <MarketplaceListingMedia
          coverUrl={listing.coverUrl}
          mediaUrls={mediaUrls}
          isNsfw={listing.isNsfw}
          isOwner={isOwner}
          viewerShowNsfw={viewerShowNsfw}
        />

        <div className="space-y-4">
          <div>
            <p className="text-xs text-muted-foreground">
              {listingTypeLabel(listing.type)} · {listing.category}
            </p>
            <h1 className="text-2xl font-bold mt-1">{listing.title}</h1>
          </div>

          <div className="rounded-xl border border-border/60 p-3 text-sm space-y-1">
            <p>
              판매자{" "}
              <Link href={`/u/${listing.seller.username}`} className="font-medium hover:underline">
                {listing.sellerProfile?.displayName ?? `@${listing.seller.username}`}
              </Link>
            </p>
            {listing.sellerProfile && (
              <p className="text-xs text-muted-foreground">
                평점{" "}
                {listing.sellerProfile.ratingAvg > 0
                  ? listing.sellerProfile.ratingAvg.toFixed(1)
                  : "-"}{" "}
                · 판매 {listing.sellerProfile.salesCount}
              </p>
            )}
          </div>

          <div className="text-sm space-y-1 text-muted-foreground">
            <p>재고 {listing.stock}</p>
            {listing.productionDays ? <p>제작기간 {listing.productionDays}일</p> : null}
            {listing.type !== "DIGITAL" && (
              <>
                <p>
                  배송비{" "}
                  {listing.shippingFeeType === "FREE"
                    ? "무료"
                    : `${listing.shippingFeeFixed.toLocaleString()}원`}
                </p>
                <p>
                  배송 가능{" "}
                  {listing.shipToCountries.length > 0
                    ? listing.shipToCountries.map((c) => shipCountryLabel(c)).join(" · ")
                    : listing.shipsWorldwide
                      ? "지원 국가 전체"
                      : "미설정"}
                </p>
              </>
            )}
            <p className="text-xs">
              플랫폼 수수료 10% — 판매자 예상 수령 {fees.sellerEarnAmount.toLocaleString()}원
            </p>
          </div>

          {options.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold">옵션</p>
              {options.map((o) => (
                <div key={o.name ?? "opt"} className="text-sm">
                  <span className="font-medium">{o.name}</span>
                  <p className="text-muted-foreground">{(o.values ?? []).join(" · ")}</p>
                </div>
              ))}
            </div>
          )}

          {isOwner ? (
            <p className="text-sm text-muted-foreground">본인 상품입니다.</p>
          ) : (
            <MarketplaceBuyPanel
              listingId={listing.id}
              listingTitle={listing.title}
              listingCoverUrl={listing.coverUrl}
              listingCurrency={listing.currency}
              listingType={listing.type}
              priceAmount={listing.priceAmount}
              stock={listing.stock}
              paymentsEnabled={isPaymentsConfigured()}
              shipToCountries={listing.shipToCountries}
              shipsWorldwide={listing.shipsWorldwide}
            />
          )}

          <Button type="button" variant="secondary" asChild>
            <Link href={`/messages?user=${listing.seller.username}`}>판매자 문의</Link>
          </Button>

          {!isOwner && <MarketplaceReportButton listingId={listing.id} />}

          <div>
            <h2 className="text-sm font-semibold mb-2">설명</h2>
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{listing.description}</p>
          </div>

          {listing.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {listing.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-muted px-2.5 py-1 text-xs">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

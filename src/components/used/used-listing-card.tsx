import Link from "next/link";
import {
  displayAuctionPrice,
  displayUsedRegion,
  formatUsedPrice,
  formatUsedTimeAgo,
  isAuctionListing,
  listingImages,
} from "@/lib/used-market";
import { isAuctionLive } from "@/lib/used-auction";
import { UsedAuctionCountdown } from "@/components/used/used-auction-countdown";
import { UsedListingThumb } from "@/components/used/used-listing-thumb";
import { UsedListingHeartButton } from "@/components/used/used-listing-heart-button";
import { Eye, Heart } from "lucide-react";

type Listing = {
  id: string;
  title: string;
  price: number;
  currency?: string | null;
  region: string;
  status: string;
  images: unknown;
  createdAt: Date;
  saleType?: string;
  auctionEndsAt?: Date | string | null;
  currentBidAmount?: number | null;
  bidCount?: number;
  auctionState?: string | null;
  bidIncrement?: number | null;
  buyNowPrice?: number | null;
  reservePrice?: number | null;
  currentBidderId?: string | null;
  antiSnipeMinutes?: number;
  restrictedKind?: string;
  isNsfw?: boolean;
  sellerId?: string;
  viewCount?: number;
  favoriteCount?: number;
  favorited?: boolean;
  _count?: { favorites?: number };
};

export function UsedListingCard({
  listing,
  viewerUserId = null,
  viewerShowNsfw = false,
}: {
  listing: Listing;
  dense?: boolean;
  viewerUserId?: string | null;
  viewerShowNsfw?: boolean;
}) {
  const imgs = listingImages(listing.images);
  const thumb = imgs[0];
  const auction = isAuctionListing(listing);
  const live =
    auction &&
    isAuctionLive({
      saleType: "AUCTION",
      price: listing.price,
      auctionEndsAt: listing.auctionEndsAt ?? null,
      bidIncrement: listing.bidIncrement ?? null,
      buyNowPrice: listing.buyNowPrice ?? null,
      reservePrice: listing.reservePrice ?? null,
      currentBidAmount: listing.currentBidAmount ?? null,
      currentBidderId: listing.currentBidderId ?? null,
      auctionState: (listing.auctionState as "LIVE" | "ENDED" | "CANCELLED" | null) ?? null,
      bidCount: listing.bidCount ?? 0,
      antiSnipeMinutes: listing.antiSnipeMinutes ?? 5,
      status: listing.status,
    });
  const showPrice = auction ? displayAuctionPrice(listing as Parameters<typeof displayAuctionPrice>[0]) : listing.price;
  const isOwner = !!viewerUserId && viewerUserId === listing.sellerId;
  const region = displayUsedRegion(listing.region) || "지역 미정";

  return (
    <article className="relative flex gap-3 px-1 py-3.5">
      <Link href={`/market/${listing.id}`} prefetch={false} className="flex min-w-0 flex-1 gap-3">
        <div className="relative h-[108px] w-[108px] shrink-0 overflow-hidden rounded-lg bg-muted">
          <UsedListingThumb
            thumb={thumb ?? null}
            dense
            isNsfw={listing.isNsfw}
            isOwner={isOwner}
            viewerShowNsfw={viewerShowNsfw}
          />
        </div>
        <div className="min-w-0 flex-1 pr-7">
          <p className="line-clamp-2 text-[15px] font-bold leading-5">{listing.title}</p>
          <p className="mt-1 truncate text-xs font-semibold text-muted-foreground">
            {region}
            {auction && listing.auctionEndsAt && listing.status === "SELLING" ? null : (
              <> · {formatUsedTimeAgo(listing.createdAt)}</>
            )}
          </p>
          <p className="mt-1.5 text-base font-extrabold text-folk-terracotta">
            {auction && (listing.bidCount ?? 0) > 0 ? "현재 " : ""}
            {formatUsedPrice(showPrice, listing.currency)}
          </p>
          <p className="mt-1.5 flex items-center gap-1 text-xs font-semibold text-muted-foreground tabular-nums">
            <Eye className="h-3.5 w-3.5" />
            {listing.viewCount ?? 0}
            <Heart className="ml-2 h-3.5 w-3.5" />
            {listing.favoriteCount ?? listing._count?.favorites ?? 0}
          </p>
          {auction && listing.auctionEndsAt && listing.status === "SELLING" ? (
            <UsedAuctionCountdown endsAt={listing.auctionEndsAt} variant="compact" />
          ) : null}
          {live && (listing.bidCount ?? 0) > 0 ? (
            <p className="mt-1 text-xs font-semibold text-muted-foreground">입찰 {listing.bidCount}</p>
          ) : null}
        </div>
      </Link>
      {!isOwner ? (
        <div className="absolute bottom-3 right-0">
          <UsedListingHeartButton
            listingId={listing.id}
            initialFavorited={!!listing.favorited}
            size="sm"
          />
        </div>
      ) : null}
    </article>
  );
}

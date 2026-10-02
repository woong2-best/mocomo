"use client";

import Link from "next/link";
import {
  displayAuctionPrice,
  displayUsedRegion,
  formatUsedPrice,
  isAuctionListing,
  listingImages,
} from "@/lib/used-market";
import { isAuctionLive } from "@/lib/used-auction";
import { UsedAuctionCountdown } from "@/components/used/used-auction-countdown";
import { UsedListingThumb } from "@/components/used/used-listing-thumb";
import { UsedListingStarButton } from "@/components/used/used-listing-star-button";
import { useLocale } from "@/components/providers/locale-provider";


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
  starred?: boolean;
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
  const { t } = useLocale();
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
  const region =
    displayUsedRegion(listing.region) || t("ui.region_tbd");

  return (
    <article className="group relative bg-card ring-1 ring-inset ring-border/50">
      <Link href={`/market/${listing.id}`} prefetch={false} className="block">
        <div className="relative aspect-square overflow-hidden bg-muted">
          <UsedListingThumb
            thumb={thumb ?? null}
            isNsfw={listing.isNsfw}
            isOwner={isOwner}
            viewerShowNsfw={viewerShowNsfw}
          />
          {auction ? (
            <span className="absolute left-1.5 top-1.5 rounded bg-zinc-950/80 px-1.5 py-0.5 text-[10px] font-extrabold text-orange-400">
              {live
                ? t("ui.live_auction")
                : t("ui.auction")}
            </span>
          ) : null}
          {auction && listing.auctionEndsAt && listing.status === "SELLING" ? (
            <div className="absolute bottom-1.5 left-1.5">
              <UsedAuctionCountdown
                endsAt={
                  listing.auctionEndsAt instanceof Date
                    ? listing.auctionEndsAt.toISOString()
                    : String(listing.auctionEndsAt)
                }
                variant="compact"
              />
            </div>
          ) : null}
        </div>
        <div className="space-y-0.5 p-2">
          <p className="line-clamp-2 text-[13px] font-bold leading-4">{listing.title}</p>
          <p className="text-sm font-extrabold text-folk-terracotta">
            {auction && (listing.bidCount ?? 0) > 0 ? t("ui.current") : ""}
            {formatUsedPrice(showPrice, listing.currency)}
          </p>
          <p className="truncate text-[11px] font-semibold text-muted-foreground">{region}</p>
          {live && (listing.bidCount ?? 0) > 0 ? (
            <p className="text-[11px] font-semibold text-muted-foreground">
              {t("used.bidCount", { count: String(listing.bidCount ?? 0) })}
            </p>
          ) : null}
        </div>
      </Link>
      <div className="absolute right-1.5 top-1.5 z-10">
        <UsedListingStarButton
          listingId={listing.id}
          initialStarred={!!listing.starred}
          variant="overlay"
        />
      </div>
    </article>
  );
}

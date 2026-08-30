import Link from "next/link";
import {
  displayAuctionPrice,
  formatUsedPrice,
  formatUsedTimeAgo,
  isAuctionListing,
  listingImages,
  usedStatusLabel,
} from "@/lib/used-market";
import { isAuctionLive, formatAuctionCountdown } from "@/lib/used-auction";
import { usedProductTypeLabel } from "@/lib/used-catalog";
import { isUsedRestrictedKind, usedRestrictedLabel } from "@/lib/used-youth-protection";
import { UsedListingThumb } from "@/components/used/used-listing-thumb";
import { MapPin, Gavel } from "lucide-react";
import { cn } from "@/lib/utils";

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
  workTitle?: string | null;
  productType?: string | null;
  isNsfw?: boolean;
  sellerId?: string;
};

export function UsedListingCard({
  listing,
  dense = false,
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
  const status = usedStatusLabel(listing.status);
  const isDone = listing.status !== "SELLING";
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
  const restricted = isUsedRestrictedKind(listing.restrictedKind);
  const isOwner = !!viewerUserId && viewerUserId === listing.sellerId;

  return (
    <Link
      href={`/used/${listing.id}`}
      prefetch={false}
      className={cn("block group used-listing-card h-full", dense && "used-listing-card--dense")}
    >
      <article
        className={cn(
          "h-full overflow-hidden bg-card",
          dense
            ? "rounded-none border-0 ring-1 ring-inset ring-border/50"
            : "folk-card-interactive rounded-xl border border-border/50",
          isDone && "opacity-70"
        )}
      >
        <div className="relative aspect-square bg-muted/40 overflow-hidden">
          <UsedListingThumb
            thumb={thumb ?? null}
            dense={dense}
            isNsfw={listing.isNsfw}
            isOwner={isOwner}
            viewerShowNsfw={viewerShowNsfw}
          />
          {restricted && (
            <span
              className={cn(
                "absolute font-bold rounded-md bg-amber-600 text-white",
                dense ? "top-1 right-1 text-[9px] px-1.5 py-0.5" : "top-2 right-2 text-[10px] px-2 py-0.5"
              )}
            >
              19+
            </span>
          )}
          {auction && live && (
            <span
              className={cn(
                "absolute font-bold rounded-md bg-orange-600 text-white flex items-center gap-0.5",
                dense ? "top-1 left-1 text-[9px] px-1.5 py-0.5" : "top-2 left-2 text-[10px] px-2 py-0.5"
              )}
            >
              <Gavel className={dense ? "h-2.5 w-2.5" : "h-3 w-3"} />
              경매
            </span>
          )}
          {status && !(auction && live) && (
            <span
              className={cn(
                "absolute font-bold rounded-md bg-black/65 text-white",
                dense ? "top-1 left-1 text-[9px] px-1.5 py-0.5" : "top-2 left-2 text-[10px] px-2 py-0.5"
              )}
            >
              {status}
            </span>
          )}
          {listing.price === 0 && !status && !auction && (
            <span
              className={cn(
                "absolute font-bold rounded-md bg-muted-foreground text-background",
                dense ? "top-1 left-1 text-[9px] px-1.5 py-0.5" : "top-2 left-2 text-[10px] px-2 py-0.5"
              )}
            >
              나눔
            </span>
          )}
        </div>
        <div className={cn(dense ? "p-1.5 space-y-0.5" : "p-2.5 space-y-1")}>
          {(listing.workTitle || listing.productType) && (
            <p className="text-[10px] text-muted-foreground line-clamp-1">
              {[listing.workTitle, usedProductTypeLabel(listing.productType)]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
          <p
            className={cn(
              "font-medium line-clamp-2 leading-snug",
              dense ? "text-xs min-h-0" : "text-sm min-h-[2.5rem]"
            )}
          >
            {listing.title}
          </p>
          <p className={cn("font-black text-foreground", dense ? "text-sm" : "text-base")}>
            {auction && (listing.bidCount ?? 0) > 0 ? "현재 " : ""}
            {formatUsedPrice(showPrice, listing.currency)}
          </p>
          <p className="text-[10px] text-muted-foreground flex items-center gap-0.5 truncate">
            <MapPin className="h-2.5 w-2.5 shrink-0" />
            {listing.region}
            {auction && live && listing.auctionEndsAt ? (
              <> · {formatAuctionCountdown(listing.auctionEndsAt)}</>
            ) : (
              <> · {formatUsedTimeAgo(listing.createdAt)}</>
            )}
          </p>
          {restricted && (
            <p className="text-[10px] text-amber-700 dark:text-amber-400 font-medium line-clamp-1">
              {usedRestrictedLabel(listing.restrictedKind!)}
            </p>
          )}
          {auction && (listing.bidCount ?? 0) > 0 && (
            <p className="text-[10px] text-orange-600 dark:text-orange-400 font-medium">
              입찰 {listing.bidCount}회
            </p>
          )}
        </div>
      </article>
    </Link>
  );
}

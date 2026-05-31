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
import { ImageOff, MapPin, Gavel } from "lucide-react";

type Listing = {
  id: string;
  title: string;
  price: number;
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
};

export function UsedListingCard({ listing }: { listing: Listing }) {
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

  return (
    <Link href={`/used/${listing.id}`} className="block group">
      <article
        className={`rounded-xl overflow-hidden bg-card border border-border/50 ${isDone ? "opacity-70" : ""}`}
      >
        <div className="relative aspect-square bg-muted/40">
          {thumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumb}
              alt=""
              className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageOff className="h-10 w-10 text-muted-foreground/35" />
            </div>
          )}
          {auction && live && (
            <span className="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-md bg-orange-600 text-white flex items-center gap-0.5">
              <Gavel className="h-3 w-3" />
              경매
            </span>
          )}
          {status && !(auction && live) && (
            <span className="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-md bg-black/65 text-white">
              {status}
            </span>
          )}
          {listing.price === 0 && !status && !auction && (
            <span className="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-md bg-muted-foreground text-background">
              나눔
            </span>
          )}
        </div>
        <div className="p-2.5 space-y-1">
          <p className="text-sm font-medium line-clamp-2 leading-snug min-h-[2.5rem]">{listing.title}</p>
          <p className="text-base font-black text-foreground">
            {auction && (listing.bidCount ?? 0) > 0 ? "현재 " : ""}
            {formatUsedPrice(showPrice)}
          </p>
          <p className="text-[11px] text-muted-foreground flex items-center gap-0.5 truncate">
            <MapPin className="h-3 w-3 shrink-0" />
            {listing.region}
            {auction && live && listing.auctionEndsAt ? (
              <> · {formatAuctionCountdown(listing.auctionEndsAt)}</>
            ) : (
              <> · {formatUsedTimeAgo(listing.createdAt)}</>
            )}
          </p>
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

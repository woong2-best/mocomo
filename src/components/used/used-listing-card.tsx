import Link from "next/link";
import {
  formatUsedPrice,
  formatUsedTimeAgo,
  listingImages,
  usedStatusLabel,
} from "@/lib/used-market";
import { MapPin } from "lucide-react";

type Listing = {
  id: string;
  title: string;
  price: number;
  region: string;
  status: string;
  images: unknown;
  createdAt: Date;
};

export function UsedListingCard({ listing }: { listing: Listing }) {
  const imgs = listingImages(listing.images);
  const thumb = imgs[0];
  const status = usedStatusLabel(listing.status);
  const isDone = listing.status !== "SELLING";

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
            <div className="w-full h-full flex items-center justify-center text-4xl text-muted-foreground/40">
              📦
            </div>
          )}
          {status && (
            <span className="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-md bg-black/65 text-white">
              {status}
            </span>
          )}
          {listing.price === 0 && !status && (
            <span className="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#FF6F0F] text-white">
              나눔
            </span>
          )}
        </div>
        <div className="p-2.5 space-y-1">
          <p className="text-sm font-medium line-clamp-2 leading-snug min-h-[2.5rem]">{listing.title}</p>
          <p className="text-base font-black text-foreground">{formatUsedPrice(listing.price)}</p>
          <p className="text-[11px] text-muted-foreground flex items-center gap-0.5 truncate">
            <MapPin className="h-3 w-3 shrink-0" />
            {listing.region} · {formatUsedTimeAgo(listing.createdAt)}
          </p>
        </div>
      </article>
    </Link>
  );
}

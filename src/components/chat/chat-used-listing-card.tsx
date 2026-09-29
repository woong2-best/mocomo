"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { UsedListingShareCard } from "@/lib/used-listing-share-card";
import { cn } from "@/lib/utils";

type Props = {
  listingId: string;
  className?: string;
};

export function ChatUsedListingCard({ listingId, className }: Props) {
  const [listing, setListing] = useState<UsedListingShareCard | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const ac = new AbortController();
    setFailed(false);
    void (async () => {
      try {
        const res = await fetch(`/api/used/listings/${encodeURIComponent(listingId)}/share-card`, {
          signal: ac.signal,
        });
        const body = (await res.json()) as { ok?: boolean; listing?: UsedListingShareCard };
        if (cancelled) return;
        if (!res.ok || !body.ok || !body.listing) {
          setFailed(true);
          setListing(null);
          return;
        }
        setListing(body.listing);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [listingId]);

  const href = listing?.href ?? `/market/${listingId}`;
  const title = listing?.title ?? "상품 보기";

  return (
    <Link
      href={href}
      className={cn(
        "block w-[240px] max-w-full overflow-hidden rounded-2xl border border-border/70 bg-background shadow-sm",
        className
      )}
    >
      <div className="relative aspect-square bg-muted">
        {listing?.imageUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={listing.imageUrl}
            alt={title}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-muted" />
        )}
      </div>
      <p className="px-3 py-2.5 text-[15px] font-semibold leading-snug text-foreground line-clamp-2">
        {failed ? "상품 페이지 열기" : title}
      </p>
    </Link>
  );
}

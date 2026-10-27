"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { errorText } from "@/lib/i18n/error-text";
import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import type { ProfileMarketListingItem } from "@/actions/profile-page";
import type { ProfileMarketTrack } from "@/lib/profile-queries";
import { UsedListingCard } from "@/components/used/used-listing-card";
import { Button } from "@/components/ui/button";

function toCardListing(item: ProfileMarketListingItem) {
  return {
    id: item.id,
    title: item.title,
    price: item.price,
    currency: item.currency,
    region: item.region,
    status: item.status,
    images: item.images,
    createdAt: new Date(item.createdAt),
    saleType: item.saleType,
    auctionEndsAt: item.auctionEndsAt,
    currentBidAmount: item.currentBidAmount,
    bidCount: item.bidCount,
    auctionState: item.auctionState,
    bidIncrement: item.bidIncrement,
    buyNowPrice: item.buyNowPrice,
    reservePrice: item.reservePrice,
    currentBidderId: item.currentBidderId,
    antiSnipeMinutes: item.antiSnipeMinutes,
    isNsfw: item.isNsfw,
    sellerId: item.sellerId,
    viewCount: item.viewCount,
    favoriteCount: item.favoriteCount,
    starred: item.starred,
  };
}

export function ProfileMarketGrid({
  username,
  track,
  initialItems,
  initialCursor,
  emptyMessage,
  viewerUserId = null,
  viewerShowNsfw = false,
}: {
  username: string;
  track: ProfileMarketTrack;
  initialItems: ProfileMarketListingItem[];
  initialCursor: string | null;
  emptyMessage: string;
  viewerUserId?: string | null;
  viewerShowNsfw?: boolean;
}) {
  const [items, setItems] = useState(initialItems);
  const [cursor, setCursor] = useState(initialCursor);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(!initialCursor);
  const [loadError, setLoadError] = useState("");
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setItems(initialItems);
    setCursor(initialCursor);
    setDone(!initialCursor);
    setLoadError("");
  }, [initialItems, initialCursor, track]);

  const loadMore = useCallback(async () => {
    if (!cursor || loading || done) return;
    setLoading(true);
    setLoadError("");
    try {
      const params = new URLSearchParams();
      if (track !== "all") params.set("kind", track);
      params.set("cursor", cursor);
      const res = await fetch(`/api/profile/${username}/market?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) {
        setLoadError(errorText(json.error ?? t("profile.sebv8ht")));
        return;
      }
      setItems((prev) => [...prev, ...(json.items as ProfileMarketListingItem[])]);
      setCursor(json.nextCursor);
      if (!json.nextCursor) setDone(true);
    } catch {
      setLoadError(t("profile.s18n7wbo"));
    } finally {
      setLoading(false);
    }
  }, [cursor, loading, done, username, track]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "240px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [loadMore]);

  if (items.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-0 border-b border-border/60">
        {items.map((item) => (
          <UsedListingCard
            key={item.id}
            listing={toCardListing(item)}
            viewerUserId={viewerUserId}
            viewerShowNsfw={viewerShowNsfw}
          />
        ))}
      </div>
      <div ref={sentinel} className="flex flex-col items-center gap-2 py-6">
        {loading && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
        {loadError && (
          <>
            <p className="text-sm text-destructive">{loadError}</p>
            <Button type="button" variant="secondary" size="sm" onClick={() => void loadMore()}>
              다시 시도
            </Button>
          </>
        )}
        {done && items.length > 0 && !loadError && (
          <p className="text-xs text-muted-foreground">{t("profile.s1es3a9e")}</p>
        )}
      </div>
    </>
  );
}
